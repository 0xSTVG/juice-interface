import '../styles/antd.css'
import '../styles/index.scss'

import { Layout } from 'antd'
import { Content } from 'antd/lib/layout/layout'
import { CoreAppWrapper, Head } from 'components/common'
import Navbar from 'components/Navbar'
import useMobile from 'hooks/Mobile'
import { useRouter } from 'next/router'
import React from 'react'

import type { AppProps } from 'next/app'

// TODO: Move this to each page where needed.
const AppWrapper: React.FC = ({ children }) => {
  const router = useRouter()
  if (router.asPath.match(/^\/#\//)) {
    router.push(router.asPath.replace('/#/', ''))
  }

  const isMobile = useMobile()

  return (
    <>
      <Layout
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'transparent',
        }}
      >
        <Navbar />
        <Content style={isMobile ? { paddingTop: 40 } : {}}>{children}</Content>
      </Layout>
    </>
  )
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Default HEAD - overwritten by specific page SEO */}
      <Head />
      <CoreAppWrapper>
        <AppWrapper>
          <Component {...pageProps} />
        </AppWrapper>
      </CoreAppWrapper>
    </>
  )
}
