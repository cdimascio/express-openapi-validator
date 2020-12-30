import { SerDes } from './types';

export const dateTime : SerDes = {
  format : 'date-time',
  serialize: (d: Date) => {
    return d && d.toISOString();
  },
  deserialize: (s: string) => {
    return new Date(s);
  }
};

export const dateTimeSerializeOnly : SerDes = {
  format : 'date-time',
  serialize: (d: Date) => {
    return d && d.toISOString();
  },
};

export const date : SerDes = {
  format : 'date',
  serialize: (d: Date) => {
    return d && d.toISOString().split('T')[0];
  },
  deserialize: (s: string) => {
    return new Date(s);
  }
};

export const dateSerializeOnly : SerDes = {
  format : 'date',
  serialize: (d: Date) => {
    return d && d.toISOString().split('T')[0];
  },
};
