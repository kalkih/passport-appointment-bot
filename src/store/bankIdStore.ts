export interface BankIdState {
  code?: BankIdStatus;
  description?: string;
  result?: number;
  qr_text?: string;
}

export enum BankIdStatus {
  COMPLETED = 1,
  SIGNING = 2,
  NOT_STARTED = 3,
  FINISHED = 4,
  EXPIRED = 5,
  EXCEPTION = 16,
  CANCELED = 17,
}

const statusDescription: Record<BankIdStatus, string> = {
  [BankIdStatus.COMPLETED]: "Identification completed",
  [BankIdStatus.SIGNING]: "Identification in progress",
  [BankIdStatus.NOT_STARTED]: "Identification not started",
  [BankIdStatus.FINISHED]: "Identification finished",
  [BankIdStatus.EXPIRED]: "Identification expired",
  [BankIdStatus.EXCEPTION]: "Identification exception",
  [BankIdStatus.CANCELED]: "Identification canceled",
};

const createState = () => ({});

const bankIdState: {
  state: BankIdState;
  setState: (data: BankIdState) => void;
  clear: () => void;
} = {
  state: createState(),
  setState(data: BankIdState) {
    if (typeof data.code !== "undefined") {
      Object.assign(bankIdState.state, {
        ...data,
        description: statusDescription[data.code],
      });
    }
  },
  clear() {
    for (const prop of Object.getOwnPropertyNames(bankIdState.state)) {
      delete bankIdState.state[prop as keyof BankIdState];
    }
  },
};

const { setState, state, clear } = bankIdState;

export {
  state as bankIdState,
  setState as setBankIdState,
  clear as clearBankIdState,
};
