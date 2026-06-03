import "@testing-library/react-native/extend-expect";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {} },
  },
}));

jest.mock("expo-device", () => ({
  isDevice: true,
}));

jest.mock("expo-linear-gradient", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    LinearGradient: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
  };
});

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(() => Promise.resolve()),
      getFirstAsync: jest.fn(() => Promise.resolve(null)),
    })
  ),
}));

jest.mock("expo-network", () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
}));

jest.mock("@expo/vector-icons", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  const makeIcon = (displayName: string) => {
    const Icon = (props: any) =>
      React.createElement(View, { ...props, "data-icon": displayName });
    Icon.displayName = displayName;
    return Icon;
  };
  return {
    Ionicons: makeIcon("Ionicons"),
    MaterialIcons: makeIcon("MaterialIcons"),
    MaterialCommunityIcons: makeIcon("MaterialCommunityIcons"),
    FontAwesome: makeIcon("FontAwesome"),
    FontAwesome5: makeIcon("FontAwesome5"),
    Feather: makeIcon("Feather"),
    AntDesign: makeIcon("AntDesign"),
    Entypo: makeIcon("Entypo"),
  };
});

jest.mock("@clerk/expo", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  ClerkLoaded: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    isSignedIn: false,
    getToken: jest.fn(() => Promise.resolve(null)),
  }),
  useClerk: () => ({
    signOut: jest.fn(),
  }),
}));

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({
    navigate: jest.fn(),
    setOptions: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
