declare module "expo-network" {
  export function getNetworkStateAsync(): Promise<{
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string | null;
  }>;
}

declare module "expo-sqlite" {
  export interface SQLiteDatabase {
    execAsync(sql: string): Promise<void>;
    runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
    getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
    getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  }
  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
}

declare module "@react-native-community/datetimepicker" {
  import { Component } from "react";
  import { ViewStyle } from "react-native";

  export interface DateTimePickerEvent {
    type: string;
    nativeEvent: { timestamp: number };
  }

  export interface DateTimePickerProps {
    value: Date;
    mode?: "date" | "time" | "datetime";
    display?: "default" | "spinner" | "calendar" | "clock";
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    minuteInterval?: number;
    style?: ViewStyle;
    testID?: string;
  }

  export default class DateTimePicker extends Component<DateTimePickerProps> {}
}