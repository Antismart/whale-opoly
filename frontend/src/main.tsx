import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WalletProvider } from './WalletProvider.tsx'

// Dojo imports
import { init } from "@dojoengine/sdk";
import { DojoSdkProvider } from "@dojoengine/sdk/react";

// Local imports
import { dojoConfig } from "../dojoConfig.ts";
import { setupWorld } from "./bindings/contracts.gen.ts";
import type { SchemaType } from "./bindings/models.gen.ts";
import { TORII_URL } from "./config.ts";

async function main() {
    // Initialize the SDK with configuration options
    const sdk = await init<SchemaType>({
        client: {
            worldAddress: dojoConfig.manifest.world.address,
            toriiUrl: TORII_URL,
        },
        // Domain configuration for typed message signing (SNIP-12)
        domain: {
            name: "WhaleOpoly",
            version: "1.0",
            chainId: "SN_SEPOLIA", // Sepolia testnet
            revision: "1",
        },
    });

    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <WalletProvider>
                <DojoSdkProvider sdk={sdk} dojoConfig={dojoConfig} clientFn={setupWorld}>
                    <App />
                </DojoSdkProvider>
            </WalletProvider>
        </StrictMode>
    );
}

main().catch(console.error);
