import './styles/antd.css'
import './styles/index.scss'

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import App from 'App'
import NetworkProvider from 'providers/NetworkProvider'
import ThemeProvider from 'providers/ThemeProvider'
import V1UserProvider from 'providers/v1/UserProvider'
import LanguageProvider from 'providers/LanguageProvider'
import ReactQueryProvider from 'providers/ReactQueryProvider'

import store from './redux/store'
import reportWebVitals from './utils/reportWebVitals'
import initSentry from './lib/sentry'

initSentry()

ReactDOM.render(
  <React.StrictMode>
    <ReactQueryProvider>
      <Provider store={store}>
        <LanguageProvider>
          <ThemeProvider>
            <NetworkProvider>
              <V1UserProvider>
                <App />
              </V1UserProvider>
            </NetworkProvider>
          </ThemeProvider>
        </LanguageProvider>
      </Provider>
    </ReactQueryProvider>
  </React.StrictMode>,
  document.getElementById('root'),
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
