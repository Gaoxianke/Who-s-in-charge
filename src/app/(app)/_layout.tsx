import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="save-select" />
      <Stack.Screen name="character-create" />
      <Stack.Screen name="subordinates" />
      <Stack.Screen name="police" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="sponsor" />
      <Stack.Screen name="factions" />
      <Stack.Screen name="events" />
      <Stack.Screen name="promotion" />
      <Stack.Screen name="departments" />
      <Stack.Screen name="dept-detail" />
      <Stack.Screen name="family" />
      <Stack.Screen name="recruit" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="governing-areas" />
      <Stack.Screen name="construction" />
      <Stack.Screen name="livelihood" />
      <Stack.Screen name="meeting" />
      <Stack.Screen name="secretary" />
      <Stack.Screen name="leadership" />
      <Stack.Screen name="monthly-report" />
      <Stack.Screen name="enterprise-list" />
      <Stack.Screen name="fiscal" />
      <Stack.Screen name="annual-report" />
      <Stack.Screen name="ministry" />
      <Stack.Screen name="vice-premier" />
      <Stack.Screen name="exchange-officer" />
      <Stack.Screen name="concurrent-posts" />
      <Stack.Screen name="national-leaders" />
      <Stack.Screen name="military" />
      <Stack.Screen name="science-tech" />
      <Stack.Screen name="discipline-inspection" />
      <Stack.Screen name="national-center" />
      <Stack.Screen name="premier-office" />
      <Stack.Screen name="personal-wealth" />
      <Stack.Screen name="cadre-selection" />
      <Stack.Screen name="four-organs" />
      <Stack.Screen name="provinces-manage" />
      <Stack.Screen name="national-construction" />
      <Stack.Screen name="military-commission" />
      <Stack.Screen name="cadre-appointment" />
      <Stack.Screen name="province-appointment" />
      <Stack.Screen name="city-appointment" />
      <Stack.Screen name="npc-congress" />
      <Stack.Screen name="official-hierarchy" />
      <Stack.Screen name="admin-panel" />
      <Stack.Screen name="enter-code" />
      <Stack.Screen name="pending-approval" />
      <Stack.Screen name="rejected-notice" />
      <Stack.Screen name="retirement-ending" />
      <Stack.Screen name="health" />
      <Stack.Screen name="personnel" />
      <Stack.Screen name="retainers" />
      <Stack.Screen name="dispatch" />
      <Stack.Screen name="game-over" />
      <Stack.Screen name="bribery" />
      <Stack.Screen name="discipline-risk" />
      <Stack.Screen name="interrogation" />
      <Stack.Screen name="illicit-assets" />
      <Stack.Screen name="ranking" />
    </Stack>
  );
}
