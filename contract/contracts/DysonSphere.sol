// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.6;

import "./stardust/ITreasury.sol";
import "./azimuth/IAzimuth.sol";
import "./azimuth/IEcliptic.sol";
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol';
import '@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol';

import '@uniswap/v3-periphery/contracts/base/PeripheryPayments.sol';
import '@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol';
import '@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol';
import '@uniswap/v3-periphery/contracts/libraries/CallbackValidation.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "./IDysonSphere.sol";

// Defines a contract named `DysonSphere`.
contract DysonSphere is IDysonSphere, IUniswapV3FlashCallback, PeripheryPayments {
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for int256;

    address public immutable feeCollector;
    ITreasury public immutable treasury;
    IAzimuth public immutable azimuth;
    ISwapRouter public immutable swapRouter;
    address public immutable weth;
    address public immutable wstr;
    uint24 public immutable fee;

    uint256 constant public oneStar = 1e18;

    constructor(
        address _feeCollector,
        ITreasury _treasury,
        IAzimuth _azimuth,
        ISwapRouter _swapRouter,
        address _weth,
        address _wstr,
        uint24 _fee,
        address _factory
    ) PeripheryImmutableState(_factory, _weth) {
        feeCollector = _feeCollector;
        treasury = _treasury;
        azimuth = _azimuth;
        swapRouter = _swapRouter;
        weth = _weth;
        wstr = _wstr;
        fee = _fee;
    }

    struct FlashParams {
        uint256 userWstr;
        uint starDepth;
        // Stars must be sorted by depth
        Star[] targetStars;
    }

    struct FlashCallbackData {
        address individualBuyerAddr;
        FlashParams params;
        uint256 amountWstr;
        PoolAddress.PoolKey poolKey;
    }

    function uniswapV3FlashCallback(
        uint256,
        uint256 feeWstr,
        bytes calldata data
    ) external override {
        FlashCallbackData memory decoded = abi.decode(data, (FlashCallbackData));
        CallbackValidation.verifyCallback(factory, decoded.poolKey);

        uint numWstr = (decoded.amountWstr + decoded.params.userWstr) / oneStar;

        uint toKeep = decoded.params.targetStars.length;

        uint16[] memory starsToReturn = new uint16[](numWstr - toKeep);

        uint keep = 0;
        uint ret = 0;
        uint feePool = 0;

        // First, redeem as many wanted stars as wanted
        for (uint i = 0; i < numWstr && keep < toKeep; ++i) {
            uint16 star = treasury.redeem();

            if (decoded.params.targetStars[keep].star == star) {
                decoded.params.targetStars[keep].depth = i + 1;
                feePool += i + 1;
                ++keep;
            } else {
                starsToReturn[ret++] = star;
            }
        }

        require(keep == toKeep, 'SNF');

        IEcliptic ecliptic = IEcliptic(azimuth.owner());

        // Now, return unwanted stars
        for (uint i = 0; i < ret; ++i) {
            uint16 star = starsToReturn[i];
            ecliptic.setTransferProxy(star, address(treasury));
            treasury.deposit(star);
        }

        // Pay back wstr
        uint256 wstrTransfer = feeWstr + decoded.amountWstr;

        if (wstrTransfer > 0) {
            TransferHelper.safeApprove(wstr, address(this), wstrTransfer);
            pay(wstr, address(this), msg.sender, wstrTransfer);
        }

        // Otherwise solidity complains about stack being too deep
        uint256 feeWstr2 = feeWstr;

        if (decoded.individualBuyerAddr == address(0)) {
            // Now, transfer the kept stars to their respective owners
            for (uint i = 0; i < decoded.params.targetStars.length; ++i) {
                uint16 star = decoded.params.targetStars[i].star;
                address owner = decoded.params.targetStars[i].targetOwner;
                uint starDepth = decoded.params.targetStars[i].depth;
                ecliptic.transferPoint(star, owner, true);
                // star price, star depth percentage (rounded up) and 1% per-star fee :)
                uint256 subFee = oneStar + (feeWstr2 * starDepth + feePool - 1) / feePool + oneStar / 100;
                require(poolMembers[owner].wstrPooled >= subFee);
                poolMembers[owner].wstrPooled -= subFee;
                delete starOwners[star];
            }

            // Next, transfer the unused funds back to their owners
            for (uint i = 0; i < decoded.params.targetStars.length; ++i) {
                address owner = decoded.params.targetStars[i].targetOwner;
                uint256 toReturn = poolMembers[owner].wstrPooled;
                delete poolMembers[owner];
                if (toReturn > 0) {
                    TransferHelper.safeApprove(wstr, address(this), toReturn);
                    pay(wstr, address(this), owner, toReturn);
                }
            }

            numStars = 0;

            // And finally, pay back the rest of the balance to the fee collector
            uint256 balanceWstr = IERC20(wstr).balanceOf(address(this));
            TransferHelper.safeApprove(wstr, feeCollector, balanceWstr);
            pay(wstr, address(this), feeCollector, balanceWstr);
        } else {
            // star prices + 1% per-star fee, and uniswap fees
            uint256 totalFee = (oneStar + oneStar / 100) * decoded.params.targetStars.length + feeWstr;
            // Now, transfer the kept stars to their respective owners
            for (uint i = 0; i < decoded.params.targetStars.length; ++i) {
                uint16 star = decoded.params.targetStars[i].star;
                address owner = decoded.params.targetStars[i].targetOwner;
                ecliptic.transferPoint(star, owner, true);
            }

            require(totalFee <= decoded.params.userWstr);

            uint256 toReturn = decoded.params.userWstr - totalFee;

            TransferHelper.safeApprove(wstr, decoded.individualBuyerAddr, toReturn);
            pay(wstr, address(this), decoded.individualBuyerAddr, toReturn);

            // And finally, pay back the rest of the balance to the fee collector
            uint256 balanceWstr = (oneStar / 100) * decoded.params.targetStars.length;
            TransferHelper.safeApprove(wstr, feeCollector, balanceWstr);
            pay(wstr, address(this), feeCollector, balanceWstr);
        }
    }

    uint public numStars;
    mapping (uint16 => address) public starOwners;
    mapping (address => PoolMember) public poolMembers;
    uint public kickCount;

    function enterPool(uint256 wstrToPool, uint16[] calldata stars) external override {
        pay(wstr, msg.sender, address(this), wstrToPool);

        poolMembers[msg.sender].wstrPooled += wstrToPool;

        for (uint i = 0; i < stars.length; ++i) {
            uint16 star = stars[i];
            require(starOwners[star] == address(0), 'SO');
            starOwners[star] = msg.sender;
            poolMembers[msg.sender].stars.push(star);
        }

        numStars += stars.length;

        // Very optimistic balance validity check.
        // We could do a full check in the stardust treasury, but getting all assets takes up ~3m gas, and the cost is only expected to grow.
        // This means we can not enforce 100% correctness at contract time, and there is a higher risk of invalid submissions, but pool members get a generous 0.15wstr bonus for kicking invalid members.
        require(poolMembers[msg.sender].stars.length * (oneStar + oneStar / 100) + poolMembers[msg.sender].stars.length * (oneStar / 100) <= poolMembers[msg.sender].wstrPooled);
    }

    function buyIndividually(uint256 wstrApproved, Star[] calldata stars, uint maxDepth) external override {
        pay(wstr, msg.sender, address(this), wstrApproved);
        doSwapStars(wstrApproved, stars, maxDepth, msg.sender);
    }

    function exitPoolInternal(address member) internal {
        TransferHelper.safeApprove(wstr, member, poolMembers[member].wstrPooled);
        pay(wstr, address(this), member, poolMembers[member].wstrPooled);

        for (uint i = 0; i < poolMembers[member].stars.length; i++) {
            delete starOwners[poolMembers[member].stars[i]];
        }

        numStars -= poolMembers[member].stars.length;

        delete poolMembers[member];
    }

    function exitPool() external override {
        exitPoolInternal(msg.sender);
    }

    function kickFromPool(address member) external override {
        require(msg.sender == feeCollector);
        exitPoolInternal(member);
    }

    function kickFromPoolOnPenaltyBasis(address member) external override {

        require(member != address(0));

        uint16[] memory assets = treasury.getAllAssets();

        uint starsCounted = 0;
        uint maxDepth = 0;

        for (uint i = 0; i < assets.length; ++i) {
            uint idx = assets.length - i - 1;
            uint16 star = assets[idx];
            address owner = starOwners[star];
            if (owner == member) {
                maxDepth = i + 1;
                ++starsCounted;
            }
        }

        // Inverse - check that the member's entry is no longer valid
        require (
            !(poolMembers[member].stars.length * (oneStar + oneStar / 100) + maxDepth * (oneStar / 100) <= poolMembers[member].wstrPooled)
            || !(starsCounted == poolMembers[member].stars.length)
        );

        // Penalize the member. The penalty is less than one star, thus we don't have to worry about underflows
        uint256 penalty = oneStar / 5;

        poolMembers[member].wstrPooled -= penalty;

        // Keep 25% of the penalty in the pool (100% if called not by member)
        // The penalty is kept to lower the number of wstr needed to borrow, but then it
        // will be transfered to the fee collector.

        // Economics wise, this is a bit iffy. This disincentivizes users from picking stars
        // shallower than 5 elements deep, because another DysonSphere pool could be used to
        // extract that star, kick the member from the pool and keep the penalty.
        // Likewise, user has the incentive to pool more wstr than needed, because they could
        // be forcefully kicked out if more stars are put in than the user can cover.

        // What is making exploitation not so attractive is the gas fees - getting all assets
        // from the treasury takes up a lot of gas.
        if (poolMembers[msg.sender].stars.length > 0) {
            poolMembers[msg.sender].wstrPooled += penalty * 3 / 4;
        }

        exitPoolInternal(member);
    }

    function pooledStars() public view override returns (Star[] memory stars, uint maxDepth) {
        stars = new Star[](numStars);

        // Compute depths of the stars and the overall fee pool
        uint16[] memory assets = treasury.getAllAssets();

        uint starsCounted = 0;

        for (uint i = 0; i < assets.length; ++i) {
            uint idx = assets.length - i - 1;
            uint16 star = assets[idx];
            address owner = starOwners[star];
            if (owner != address(0)) {
                maxDepth = i + 1;
                stars[starsCounted].star = star;
                stars[starsCounted].targetOwner = owner;
                stars[starsCounted].depth = maxDepth;
                //uint ownerId = addressIds[owner] - 1;
                //ownerDepths[ownerId] = maxDepth;
                ++starsCounted;
            }
        }

        // TODO: work without collecting all the stars
        require(starsCounted == stars.length, 'NAF');
    }

    function poolMember(address addr) external override view returns (PoolMember memory member) {
        member = poolMembers[addr];
    }

    function enterPoolAndKick(uint256 wstrToPool, Star[] memory stars, uint maxDepth) external override {
        pay(wstr, msg.sender, address(this), wstrToPool);

        poolMembers[msg.sender].wstrPooled += wstrToPool;

        // Verify the owners of the starsm add ourselves if owner is null
        for (uint i = 0; i < stars.length; i++) {
            address targetOwner = stars[i].targetOwner;
            if (targetOwner == address(0x0)) {
                stars[i].targetOwner = msg.sender;
                starOwners[stars[i].star] = msg.sender;
                poolMembers[msg.sender].stars.push(stars[i].star);
                ++numStars;
            } else {
                require(targetOwner == starOwners[stars[i].star]);
            }
        }

        uint256 balanceWstr = IERC20(wstr).balanceOf(address(this));

        require(stars.length == numStars);
        doSwapStars(balanceWstr, stars, maxDepth, address(0));
    }

    function kickPoolFast(Star[] calldata stars, uint maxDepth) external override {

        // Verify the owners of the stars
        for (uint i = 0; i < stars.length; i++) {
            address targetOwner = stars[i].targetOwner;
            require(targetOwner != address(0x0) && targetOwner == starOwners[stars[i].star]);
        }

        // Must be a pool member to kick
        require(poolMembers[msg.sender].stars.length != 0, 'NPM');

        kickCount += 1;

        uint256 balanceWstr = IERC20(wstr).balanceOf(address(this));

        require(stars.length == numStars);
        doSwapStars(balanceWstr, stars, maxDepth, address(0));
    }

    function doSwapStars(uint256 balanceWstr, Star[] memory stars, uint maxDepth, address individualBuyerAddr) internal {

        uint256 starsToBuy = oneStar * stars.length;
        uint256 wstrToFlash = oneStar * maxDepth;

        if (wstrToFlash > balanceWstr) {
            wstrToFlash -= balanceWstr;
        } else {
            wstrToFlash = 0;
        }

        uint256 fees = (wstrToFlash + 99) / 100;

        // Check balance
        require(starsToBuy + fees <= balanceWstr);

        // Scope of flash loan
        {
            PoolAddress.PoolKey memory poolKey =
                PoolAddress.PoolKey({token0: weth, token1: wstr, fee: fee});
            IUniswapV3Pool pool = IUniswapV3Pool(PoolAddress.computeAddress(factory, poolKey));

            FlashParams memory params = FlashParams ({
                userWstr: balanceWstr,
                starDepth: maxDepth,
                targetStars: stars
            });

            pool.flash(
                address(this),
                0,
                wstrToFlash,
                abi.encode(
                    FlashCallbackData({
                        params: params,
                        individualBuyerAddr: individualBuyerAddr,
                        amountWstr: wstrToFlash,
                        poolKey: poolKey
                    })
                )
            );
        }
    }
}

