import { LoginCard } from "./login-card";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return <LoginCard inactive={error === "inactive"} />;
}
