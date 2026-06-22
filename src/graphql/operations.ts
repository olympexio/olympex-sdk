export const GET_ENABLED_CHAINS = /* GraphQL */ `
  query GetEnabledChains {
    getEnabledChains {
      chainIds
    }
  }
`;

export const GET_QUOTE = /* GraphQL */ `
  query GetQuote($getQuoteParams: QuoteInput!) {
    getQuote(params: $getQuoteParams) {
      outAmount
      estimatedGas
      aggregatorId
      aggregatorOrder
      market {
        dexName
        swapAmount
        dexImageURL
      }
      routes {
        percentage
        subRoutes {
          from
          to
          dexes {
            name
            percentage
          }
        }
      }
      dataFeeTransaction {
        effectiveGasPrice
        nativePrice
        transactionFee
        transactionFeeInUSD
        tokenPrice
        transactionFeeInTokenIn
        valueToApprove
      }
      gasMultiplier
    }
  }
`;

export const GET_QUOTE_SWAP = /* GraphQL */ `
  mutation GetQuoteSwap($getQuoteSwapParams: QuoteSwapInput!) {
    getQuoteSwap(params: $getQuoteSwapParams) {
      code
      message
      quoteSwap {
        data
        estimatedGas
        minOutAmount
        outAmount
        value
        approveTransaction
      }
      success
    }
  }
`;

export const GET_CROSS_CHAIN_QUOTE = /* GraphQL */ `
  query GetCrossChainQuote($params: CrossChainQuoteInput!) {
    getCrossChainQuote(params: $params) {
      code
      message
      success
      crossChainQuote {
        aggregatorId
        estimatedGas
        estimatedTime
        estimateCostInUSD
        fromTokenAmount
        toTokenAmount
        minimumReceived
        bridgeInfo {
          icon
          displayName
        }
        middlewareRoute {
          chainFrom {
            fromAsset {
              address
              decimals
              symbol
            }
            toAsset {
              address
              decimals
              symbol
            }
          }
          chainTo {
            fromAsset {
              address
              decimals
              symbol
            }
            toAsset {
              address
              decimals
              symbol
            }
          }
        }
      }
    }
  }
`;

export const GET_CROSS_CHAIN_SWAP = /* GraphQL */ `
  mutation GetCrossChainSwap($params: CrossChainSwapInput!) {
    getCrossChainSwap(params: $params) {
      code
      message
      success
      crossChainSwap {
        calldata
        value
        approveTransaction
        dexHash
      }
    }
  }
`;

export const GET_CROSS_CHAIN_TX_STATUS = /* GraphQL */ `
  query GetCrossChainTxStatus($hash: String!, $chainId: String!, $dexHash: String!) {
    getCrossChainTxStatus(txHash: $hash, chainId: $chainId, dexHash: $dexHash) {
      message
      success
      txStatus {
        toChainId
        fromChainId
        detailStatus
        status
      }
    }
  }
`;
