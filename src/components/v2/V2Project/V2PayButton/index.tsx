import { t, Trans } from '@lingui/macro'
import { Button, Tooltip } from 'antd'
import ETHAmount from 'components/currency/ETHAmount'
import { useContext, useState } from 'react'
import { V2ProjectContext } from 'contexts/v2/projectContext'
import { V2_CURRENCY_USD } from 'utils/v2/currency'
import PayWarningModal from 'components/PayWarningModal'
import useWeiConverter from 'hooks/WeiConverter'
import { V2CurrencyOption } from 'models/v2/currencyOption'
import { PayButtonProps } from 'components/inputs/Pay/PayInputGroup'

import { reloadWindow } from 'utils/windowUtils'

import { V2ConfirmPayModal } from './V2ConfirmPayModal'

export default function V2PayButton({
  payAmount,
  payInCurrency,
  onError,
  disabled,
  wrapperStyle,
}: PayButtonProps) {
  const { projectMetadata, fundingCycleMetadata, isArchived } =
    useContext(V2ProjectContext)

  const [payModalVisible, setPayModalVisible] = useState<boolean>(false)
  const [payWarningModalVisible, setPayWarningModalVisible] =
    useState<boolean>(false)

  const weiPayAmt = useWeiConverter<V2CurrencyOption>({
    currency: payInCurrency as V2CurrencyOption,
    amount: payAmount,
  })

  if (!fundingCycleMetadata) return null

  const payButtonText = projectMetadata?.payButton?.length
    ? projectMetadata.payButton
    : t`Pay`

  let disabledMessage: string | undefined
  if (isArchived) {
    disabledMessage = t`This project is archived and can't be paid.`
  } else if (fundingCycleMetadata.pausePay) {
    disabledMessage = t`Payments are paused in this funding cycle.`
  }

  const isPayDisabled = Boolean(disabledMessage) || disabled

  return (
    <div style={{ textAlign: 'center', ...wrapperStyle }}>
      <Tooltip
        visible={isPayDisabled ? undefined : false}
        title={disabledMessage}
        className="block"
      >
        <Button
          style={{ width: '100%' }}
          type="primary"
          onClick={() => {
            if (weiPayAmt?.eq(0)) {
              return onError?.()
            }
            setPayWarningModalVisible(true)
          }}
          disabled={isPayDisabled}
        >
          {payButtonText}
        </Button>
      </Tooltip>
      {payInCurrency === V2_CURRENCY_USD && (
        <div style={{ fontSize: '.7rem' }}>
          <Trans>
            Paid as <ETHAmount amount={weiPayAmt} />
          </Trans>
        </div>
      )}

      <PayWarningModal
        visible={payWarningModalVisible}
        onOk={() => {
          setPayWarningModalVisible(false)
          setPayModalVisible(true)
        }}
        onCancel={() => setPayWarningModalVisible(false)}
      />
      <V2ConfirmPayModal
        visible={payModalVisible}
        onSuccess={reloadWindow}
        onCancel={() => setPayModalVisible(false)}
        weiAmount={weiPayAmt}
      />
    </div>
  )
}
