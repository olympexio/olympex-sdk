import {
  createAccount,
  initialize,
  type FeeOptions,
  type OlympexClient,
  type QuoteRequest,
  type SwapRequest,
} from '../../../../dist/index.js';

const client: OlympexClient = initialize({
  apiKey: 'test-key',
  apiSecret: 'test-secret',
  passphrase: 'test-passphrase',
});

const defaultFees: FeeOptions = {
  feeBps: 10,
  feeRecipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
};

const quoteRequest: QuoteRequest = {
  mode: 'single-chain',
  params: {
    chainId: 1,
    inTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    outTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1',
    slippage: '1',
    gasPrice: '30',
  },
  fees: defaultFees,
};

const swapRequest: SwapRequest = {
  mode: 'single-chain',
  params: {
    chainId: 1,
    inTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    outTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1',
    slippage: '1',
    gasPrice: '30',
    account: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    aggregatorId: 'olympex',
  },
};

void client.quote(quoteRequest);
void client.swap(swapRequest);
void createAccount({ name: 'App', password: 'secret' });
