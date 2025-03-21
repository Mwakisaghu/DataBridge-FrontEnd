import {configureStore} from '@reduxjs/toolkit';
import migrationsHandler from './migrationsSlice';

export const store = configureStore({
  reducer: {
    migrations: migrationsHandler,
    },
});

export default store;