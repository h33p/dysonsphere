import { ThemeProvider } from 'next-themes'

import Page from '../components/Page'
import ProviderExample from '../components/ProviderExample'

export default function Home() {
  return (
    <ThemeProvider attribute="class">
      <ProviderExample />
      <Page />
    </ThemeProvider>
  )
}
