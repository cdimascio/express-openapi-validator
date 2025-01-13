import { SerDes, SerDesSingleton } from './types';

export const dateTime : SerDesSingleton = new SerDesSingleton({
  format : 'date-time',
  serialize: (d: Date) => {
    return d && d.toISOString();
  },
  deserialize: (s: string) => {
    return new Date(s);
  }
});

export const date : SerDesSingleton = new SerDesSingleton({
  format : 'date',
  serialize: (d: Date) => {
    return d && d.toISOString().split('T')[0];
  },
  deserialize: (s: string) => {
    return new Date(s);
  }
});

export const defaultSerDes : SerDes[] = [
  date.serializer,
  dateTime.serializer
];
