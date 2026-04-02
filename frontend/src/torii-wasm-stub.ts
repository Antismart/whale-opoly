/**
 * Stub module for @dojoengine/torii-wasm
 *
 * WHY THIS EXISTS:
 * The published @dojoengine/torii-wasm@1.6.4 npm package is broken — its
 * package.json references ./pkg/web/dojo_c.js as the entry point, but the
 * pkg/ directory was never included in the npm tarball. Without this stub,
 * Vite cannot resolve the import and the build fails.
 *
 * The alias is configured in vite.config.ts so that all imports of
 * "@dojoengine/torii-wasm" (including transitive ones from @dojoengine/sdk
 * and @dojoengine/torii-client) resolve to this file instead.
 *
 * WHAT THIS MEANS:
 * - ToriiClient is a no-op: entity subscriptions and queries return empty
 *   results. The app can render and handle UI interactions but won't receive
 *   live blockchain state from the Torii indexer.
 * - Hashing / selector functions return "0x0" — any code relying on real
 *   values will need the real WASM package.
 *
 * TODO: Remove this stub (and the vite.config.ts alias) once
 * @dojoengine/torii-wasm ships a working build. Track the upstream issue
 * or try upgrading to a newer Dojo SDK version that bundles the WASM
 * bindings differently.
 */

/* -------------------------------------------------------------------------- */
/*  Constructor stubs                                                         */
/* -------------------------------------------------------------------------- */

export class Account {
  constructor(..._args: unknown[]) {}
}

export class ByteArray {
  constructor(..._args: unknown[]) {}
}

export class ControllerAccount {
  constructor(..._args: unknown[]) {}
}

export class Provider {
  constructor(..._args: unknown[]) {}
}

export class SigningKey {
  constructor(..._args: unknown[]) {}
}

export class Subscription {
  constructor(..._args: unknown[]) {}
}

export class ToriiClient {
  constructor(..._args: unknown[]) {}

  async getEntities() {
    return { items: [], next_cursor: undefined };
  }

  async getEventMessages() {
    return { items: [], next_cursor: undefined };
  }

  async onEntityUpdated(
    _clause: unknown,
    _callback: unknown,
  ) {
    return { cancel: () => {} };
  }

  async onEventMessageUpdated(
    _clause: unknown,
    _callback: unknown,
  ) {
    return { cancel: () => {} };
  }

  async updateEntitySubscription(
    _subscription: unknown,
    _clause: unknown,
  ) {}

  async updateEventMessageSubscription(
    _subscription: unknown,
    _clause: unknown,
  ) {}

  async publishMessage(_msg: unknown) {
    return {};
  }

  async publishMessageBatch(_msgs: unknown) {
    return {};
  }

  async onTokenBalanceUpdated(
    _contractAddresses: string[],
    _accountAddresses: string[],
    _tokenIds: string[],
    _callback: unknown,
  ) {
    return { cancel: () => {} };
  }

  async onTokenUpdated(
    _contractAddresses: string[],
    _tokenIds: string[],
    _callback: unknown,
  ) {
    return { cancel: () => {} };
  }

  async getTokens(_params: unknown) {
    return { items: [] };
  }

  async getTokenBalances(_params: unknown) {
    return { items: [] };
  }

  async getControllers(_params: unknown) {
    return { items: [] };
  }
}

export class TypedData {
  constructor(..._args: unknown[]) {}
}

export class VerifyingKey {
  constructor(..._args: unknown[]) {}
}

/* -------------------------------------------------------------------------- */
/*  Streaming / WASM internals (unused but exported by the real package)      */
/* -------------------------------------------------------------------------- */

export const IntoUnderlyingByteSource = class {
  constructor(..._args: unknown[]) {}
};

export const IntoUnderlyingSink = class {
  constructor(..._args: unknown[]) {}
};

export const IntoUnderlyingSource = class {
  constructor(..._args: unknown[]) {}
};

/* -------------------------------------------------------------------------- */
/*  Utility / hashing function stubs                                          */
/* -------------------------------------------------------------------------- */

export const getContractAddress = (..._args: unknown[]): string => "0x0";

export const getSelectorFromTag = (..._args: unknown[]): string => "0x0";

export const poseidonHash = (..._args: unknown[]): string => "0x0";

export const getSelectorFromName = (..._args: unknown[]): string => "0x0";

export const starknetKeccak = (..._args: unknown[]): string => "0x0";

export const cairoShortStringToFelt = (..._args: unknown[]): string => "0x0";

export const parseCairoShortString = (..._args: unknown[]): string => "";

/* -------------------------------------------------------------------------- */
/*  Default export for compatibility                                          */
/* -------------------------------------------------------------------------- */

export default {
  Account,
  ByteArray,
  ControllerAccount,
  IntoUnderlyingByteSource,
  IntoUnderlyingSink,
  IntoUnderlyingSource,
  Provider,
  SigningKey,
  Subscription,
  ToriiClient,
  TypedData,
  VerifyingKey,
  getContractAddress,
  getSelectorFromTag,
  poseidonHash,
  getSelectorFromName,
  starknetKeccak,
  cairoShortStringToFelt,
  parseCairoShortString,
};
