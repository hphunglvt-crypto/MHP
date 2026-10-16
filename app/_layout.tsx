import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        value={
          colorScheme === "dark"
            ? DarkTheme
            : DefaultTheme
        }
      >
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="qr-scanner"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="exam-setup"
            options={{
              headerShown: false,
            }}
          />
<Stack.Screen
  name="exam-detail"
  options={{
    headerShown: false,
  }}
/>

<Stack.Screen
  name="grading-list"
  options={{
    headerShown: false,
  }}
/>        

<Stack.Screen
  name="answer-keys"
  options={{
    headerShown: false,
  }}
/>
	<Stack.Screen
            name="exam-scanner"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="omr-analysis"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              title: "Modal",
            }}
          />
<Stack.Screen
  name="graded-papers"
  options={{
    headerShown: false,
  }}
/>

<Stack.Screen
  name="export-results"
  options={{
    headerShown: false,
  }}
/>

        </Stack>

        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}