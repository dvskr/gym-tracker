import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Slot, usePathname, router } from 'expo-router';
import { Home, Dumbbell, History, TrendingUp, User } from 'lucide-react-native';

const tabs = [
  { name: 'index', title: 'Home', icon: Home, path: '/(tabs)' },
  { name: 'workout', title: 'Workout', icon: Dumbbell, path: '/(tabs)/workout' },
  { name: 'history', title: 'History', icon: History, path: '/(tabs)/history' },
  { name: 'progress', title: 'Progress', icon: TrendingUp, path: '/(tabs)/progress' },
  { name: 'profile', title: 'Profile', icon: User, path: '/(tabs)/profile' },
];

export default function TabsLayout() {
  const pathname = usePathname();

  const isActive = (tabPath: string, tabName: string) => {
    if (tabName === 'index') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname.includes(tabName);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = isActive(tab.path, tab.name);
          const Icon = tab.icon;
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => router.push(tab.path as any)}
            >
              <Icon 
                color={active ? '#3b82f6' : '#94a3b8'} 
                size={24} 
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: '#3b82f6',
  },
});
