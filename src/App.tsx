import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import GreetingScreen from './screens/GreetingScreen';

export default function App() {
  const [tab, setTab] = useState<'messages' | 'greeting'>('messages');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {tab === 'messages' ? <HomeScreen /> : <GreetingScreen />}
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('messages')}>
          <Text style={[styles.tabText, tab === 'messages' && styles.tabTextActive]}>
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('greeting')}>
          <Text style={[styles.tabText, tab === 'greeting' && styles.tabTextActive]}>
            Accueil
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0e10' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: '#0e0e10',
  },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#4da3ff' },
});
