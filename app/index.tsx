import { Redirect } from "expo-router";

import { useSelector } from "react-redux";
import type { RootState } from "@/store";

export default function Index() {
  const isAuthenticated = useSelector((state: RootState) => state.auth?.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return <Redirect href="/(app)" />;
}
