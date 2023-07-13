import { createPublicClient, http } from "viem";
import {
  mainnet,
  goerli,
  arbitrum,
  bsc,
  polygon,
  avalanche,
  fantom,
  moonbeam,
  moonriver,
  harmonyOne,
  optimism,
  metis,
  baseGoerli,
  gnosis,
} from "viem/chains";
import { STATUS_CODE } from "./constants";

const chainConfigs = {
  mainnet: {
    ...mainnet,
    rpcUrls: {
      public: {
        http: [process.env.ETHEREUM_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.ETHEREUM_MAINNET_RPC_URL],
      },
    },
  },
  goerli: {
    ...goerli,
    rpcUrls: {
      public: {
        http: [process.env.GOERLI_RPC_URL],
      },
      default: {
        http: [process.env.GOERLI_RPC_URL],
      },
    },
  },
  arbitrum: {
    ...arbitrum,
    rpcUrls: {
      public: {
        http: [process.env.ARBITRUM_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.ARBITRUM_MAINNET_RPC_URL],
      },
    },
  },
  bsc: {
    ...bsc,
    rpcUrls: {
      public: {
        http: [process.env.BSC_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.BSC_MAINNET_RPC_URL],
      },
    },
  },
  polygon: {
    ...polygon,
    rpcUrls: {
      public: {
        http: [process.env.POLYGON_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.POLYGON_MAINNET_RPC_URL],
      },
    },
  },
  avalanche: {
    ...avalanche,
    rpcUrls: {
      public: {
        http: [process.env.AVALANCHE_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.AVALANCHE_MAINNET_RPC_URL],
      },
    },
  },
  fantom: {
    ...fantom,
    rpcUrls: {
      public: {
        http: [process.env.FANTOM_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.FANTOM_MAINNET_RPC_URL],
      },
    },
  },
  moonbeam: {
    ...moonbeam,
    rpcUrls: {
      public: {
        http: [process.env.MOONBEAM_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.MOONBEAM_MAINNET_RPC_URL],
      },
    },
  },
  moonriver: {
    ...moonriver,
    rpcUrls: {
      public: {
        http: [process.env.MOONRIVER_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.MOONRIVER_MAINNET_RPC_URL],
      },
    },
  },
  harmonyOne: {
    ...harmonyOne,
    rpcUrls: {
      public: {
        http: [process.env.HARMONY_ONE_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.HARMONY_ONE_MAINNET_RPC_URL],
      },
    },
  },
  optimism: {
    ...optimism,
    rpcUrls: {
      public: {
        http: [process.env.OPTIMISM_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.OPTIMISM_MAINNET_RPC_URL],
      },
    },
  },
  metis: {
    ...metis,
    rpcUrls: {
      public: {
        http: [process.env.METIS_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.METIS_MAINNET_RPC_URL],
      },
    },
  },
  baseGoerli: {
    ...baseGoerli,
    rpcUrls: {
      public: {
        http: [process.env.BASE_GOERLI_RPC_URL],
      },
      default: {
        http: [process.env.BASE_GOERLI_RPC_URL],
      },
    },
  },
  gnosis: {
    ...gnosis,
    rpcUrls: {
      public: {
        http: [process.env.GNOSIS_MAINNET_RPC_URL],
      },
      default: {
        http: [process.env.GNOSIS_MAINNET_RPC_URL],
      },
    },
  },
};

export function getClient(chain) {
  let publicClient;
  try {
    publicClient = createPublicClient({
      chain: chainConfigs[chain],
      transport: http(),
    });
  } catch (error) {
    return {
      status: STATUS_CODE.INTERNAL_ERROR,
      error: {
        errorCode: "FAILED_CLIENT_CREATION",
        message: `Failed to create client for chain ${chain}: ${error.message}`,
      },
    };
  }

  return publicClient;
}
