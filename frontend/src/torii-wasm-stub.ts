// Temporary stub for @dojoengine/torii-wasm until the package is properly built

// Mock constructor classes
export class Account {
  constructor(..._args: any[]) {
    console.warn('Using stubbed Account constructor');
  }
}

export class ByteArray {
  constructor(..._args: any[]) {
    console.warn('Using stubbed ByteArray constructor');
  }
}

export class ControllerAccount {
  constructor(..._args: any[]) {
    console.warn('Using stubbed ControllerAccount constructor');
  }
}

export class Provider {
  constructor(..._args: any[]) {
    console.warn('Using stubbed Provider constructor');
  }
}

export class SigningKey {
  constructor(..._args: any[]) {
    console.warn('Using stubbed SigningKey constructor');
  }
}

export class Subscription {
  constructor(..._args: any[]) {
    console.warn('Using stubbed Subscription constructor');
  }
}

export class ToriiClient {
  constructor(..._args: any[]) {
    console.warn('Using stubbed ToriiClient constructor');
  }
  
  // Mock methods that might be called
  async getEntities() {
    return [];
  }
  
  async subscribeEntityQuery() {
    return {
      cancel: () => {}
    };
  }
}

export class TypedData {
  constructor(..._args: any[]) {
    console.warn('Using stubbed TypedData constructor');
  }
}

export class VerifyingKey {
  constructor(..._args: any[]) {
    console.warn('Using stubbed VerifyingKey constructor');
  }
}

// Mock utility classes/objects
export const IntoUnderlyingByteSource = class {
  constructor(..._args: any[]) {
    console.warn('Using stubbed IntoUnderlyingByteSource constructor');
  }
};

export const IntoUnderlyingSink = class {
  constructor(..._args: any[]) {
    console.warn('Using stubbed IntoUnderlyingSink constructor');
  }
};

export const IntoUnderlyingSource = class {
  constructor(..._args: any[]) {
    console.warn('Using stubbed IntoUnderlyingSource constructor');
  }
};

// Mock utility functions
export const getContractAddress = (..._args: any[]) => {
  console.warn('Using stubbed getContractAddress function');
  return '0x0';
};

export const getSelectorFromTag = (..._args: any[]) => {
  console.warn('Using stubbed getSelectorFromTag function');
  return '0x0';
};

export const poseidonHash = (..._args: any[]) => {
  console.warn('Using stubbed poseidonHash function');
  return '0x0';
};

export const getSelectorFromName = (..._args: any[]) => {
  console.warn('Using stubbed getSelectorFromName function');
  return '0x0';
};

export const starknetKeccak = (..._args: any[]) => {
  console.warn('Using stubbed starknetKeccak function');
  return '0x0';
};

export const cairoShortStringToFelt = (..._args: any[]) => {
  console.warn('Using stubbed cairoShortStringToFelt function');
  return '0x0';
};

export const parseCairoShortString = (..._args: any[]) => {
  console.warn('Using stubbed parseCairoShortString function');
  return '';
};

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