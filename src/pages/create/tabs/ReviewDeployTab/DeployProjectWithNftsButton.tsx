import { Trans } from '@lingui/macro'
import { Button, FormInstance } from 'antd'
import {
  useAppSelector,
  useEditingV2FundAccessConstraintsSelector,
  useEditingV2FundingCycleDataSelector,
  useEditingV2FundingCycleMetadataSelector,
} from 'hooks/AppSelector'
import {
  TxNftArg,
  useLaunchProjectWithNftsTx,
} from 'hooks/v2/transactor/LaunchProjectWithNftsTx'
import { useCallback, useContext, useState } from 'react'
import { uploadProjectMetadata } from 'utils/ipfs'
import { TransactionReceipt } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'
import { NetworkContext } from 'contexts/networkContext'
import { emitErrorNotification } from 'utils/notifications'

import TransactionModal from 'components/TransactionModal'

import { useAppDispatch } from 'hooks/AppDispatch'

import { editingV2ProjectActions } from 'redux/slices/editingV2Project'

import { v2ProjectRoute } from 'utils/routes'
import { TransactionEvent } from 'bnc-notify'
import { useRouter } from 'next/router'

import { readNetwork } from 'constants/networks'
import { findTransactionReceipt } from './utils'

const NFT_CREATE_EVENT_IDX = 2
const NFT_PROJECT_ID_TOPIC_IDX = 1

// Projects with NFT rewards need useDataSourceForPay to be true for NFT rewards to work
export const NFT_FUNDING_CYCLE_METADATA_OVERRIDES = {
  useDataSourceForPay: true,
}

/**
 * Return the project ID created from a `launchProjectFor` transaction.
 * @param txReceipt receipt of `launchProjectFor` transaction
 */
const getProjectIdFromNftLaunchReceipt = (
  txReceipt: TransactionReceipt,
): number => {
  const projectIdHex =
    txReceipt?.logs[NFT_CREATE_EVENT_IDX]?.topics?.[NFT_PROJECT_ID_TOPIC_IDX]
  const projectId = BigNumber.from(projectIdHex).toNumber()

  return projectId
}

export function DeployProjectWithNftsButton({ form }: { form: FormInstance }) {
  const launchProjectWithNftsTx = useLaunchProjectWithNftsTx()
  const router = useRouter()

  const { userAddress, onSelectWallet } = useContext(NetworkContext)

  const {
    projectMetadata: { name: projectName },
  } = useAppSelector(state => state.editingV2Project)

  const [deployLoading, setDeployLoading] = useState<boolean>()
  const [transactionPending, setTransactionPending] = useState<boolean>()

  const {
    projectMetadata,
    reservedTokensGroupedSplits,
    payoutGroupedSplits,
    nftRewards: { CIDs, rewardTiers, collectionName, collectionSymbol },
  } = useAppSelector(state => state.editingV2Project)
  const fundingCycleMetadata = useEditingV2FundingCycleMetadataSelector()
  const fundingCycleData = useEditingV2FundingCycleDataSelector()
  const fundAccessConstraints = useEditingV2FundAccessConstraintsSelector()
  const dispatch = useAppDispatch()

  const deployProject = useCallback(async () => {
    setDeployLoading(true)
    if (
      !(
        projectMetadata?.name &&
        fundingCycleData &&
        fundingCycleMetadata &&
        fundAccessConstraints
      )
    ) {
      setDeployLoading(false)
      throw new Error('Error deploying project.')
    }

    // Upload project metadata
    const uploadedMetadata = await uploadProjectMetadata(projectMetadata)

    if (!uploadedMetadata.IpfsHash) {
      console.error('Failed to upload project metadata.')
      setDeployLoading(false)
      return
    }

    const txOpts = {
      onDone() {
        console.info('Transaction executed. Awaiting confirmation...')
        setTransactionPending(true)
      },
      async onConfirmed(result: TransactionEvent | undefined) {
        const txHash = result?.transaction?.hash
        if (!txHash) {
          return // TODO error notififcation
        }

        const txReceipt = await findTransactionReceipt(txHash)
        if (!txReceipt) {
          return // TODO error notififcation
        }
        console.info('Found tx receipt.')

        const projectId = getProjectIdFromNftLaunchReceipt(txReceipt)

        if (projectId === undefined) {
          return // TODO error notififcation
        }

        // Reset Redux state/localstorage after deploying
        dispatch(editingV2ProjectActions.resetState())

        router.push(`${v2ProjectRoute({ projectId })}?newDeploy=true`)
      },
      onCancelled() {
        setDeployLoading(false)
        setTransactionPending(false)
      },
    }

    const handleProjectLaunchFailed = (error: Error) => {
      emitErrorNotification(`Failure: ${error}`)
      setDeployLoading(false)
      setTransactionPending(false)
    }

    const groupedSplits = [payoutGroupedSplits, reservedTokensGroupedSplits]

    let txSuccessful: boolean

    try {
      if (projectName && CIDs) {
        // create mapping from cids -> contributionFloor
        const nftRewardsArg: TxNftArg = {}

        CIDs.map((cid, index) => {
          nftRewardsArg[cid] = rewardTiers[index].contributionFloor
        })

        txSuccessful = await launchProjectWithNftsTx(
          {
            collectionName: collectionName ?? projectName,
            collectionSymbol: collectionSymbol ?? '',
            projectMetadataCID: uploadedMetadata.IpfsHash,
            fundingCycleData,
            fundingCycleMetadata: {
              ...fundingCycleMetadata,
              ...NFT_FUNDING_CYCLE_METADATA_OVERRIDES,
            },
            fundAccessConstraints,
            groupedSplits,
            nftRewards: nftRewardsArg,
          },
          txOpts,
        )
        if (!txSuccessful) {
          setDeployLoading(false)
          setTransactionPending(false)
        }
      }
    } catch (error) {
      handleProjectLaunchFailed(error as Error)
    }
  }, [
    projectName,
    launchProjectWithNftsTx,
    projectMetadata,
    fundingCycleData,
    fundingCycleMetadata,
    fundAccessConstraints,
    payoutGroupedSplits,
    reservedTokensGroupedSplits,
    CIDs,
    rewardTiers,
    collectionName,
    collectionSymbol,
    dispatch,
    router,
  ])

  const onButtonClick = async () => {
    try {
      await form.validateFields()
    } catch {
      return
    }

    if (!userAddress) {
      return onSelectWallet?.()
    }

    return deployProject()
  }

  return (
    <>
      <Button
        onClick={onButtonClick}
        type="primary"
        htmlType="submit"
        size="large"
        disabled={!projectMetadata?.name}
        loading={deployLoading}
      >
        <span>
          {userAddress ? (
            <Trans>Deploy project to {readNetwork.name}</Trans>
          ) : (
            <Trans>Connect wallet to deploy</Trans>
          )}
        </span>
      </Button>
      <TransactionModal
        transactionPending={transactionPending}
        visible={transactionPending}
      />
    </>
  )
}
