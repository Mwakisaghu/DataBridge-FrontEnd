import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    totalMigrations: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    logs : [],
};

const migrationsSlice = createSlice({
    name : 'migrations',
    initialState,
    reducers: {
        addMigration: (state, action) => {
            state.logs.push(action.payload);
        },
        updateStats: (state, action) => {
            state.totalMigrations += action.payload.total;
            state.successfulMigrations += action.payload.successful;
            state.failedMigrations += action.payload.failed;
    },
    },
});

export const { addMigration, updateStats } = migrationsSlice.actions;
export default migrationsSlice.reducer; 
