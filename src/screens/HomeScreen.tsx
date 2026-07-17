import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import Sound from 'react-native-sound';

const { CallScreeningModule } = NativeModules;
const callEvents = new NativeEventEmitter(CallScreeningModule);

type VoicemailEntry = {
  id: string;
  caller: string;
  filePath: string;
  date: string;
};

export default function HomeScreen() {
  const [messages, setMessages] = useState<VoicemailEntry[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    requestPermissions();

    const sub = callEvents.addListener('onRecordingSaved', (filePath: string) => {
      const fileName = filePath.split('/').pop() || '';
      const [, caller, dateRaw] = fileName.replace('.m4a', '').split('_');
      setMessages((prev) => [
        {
          id: fileName,
          caller: caller || 'Numéro inconnu',
          filePath,
          date: dateRaw || '',
        },
        ...prev,
      ]);
    });

    CallScreeningModule.startListening();

    return () => sub.remove();
  }, []);

  const requestPermissions = async () => {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ]);
  };

  const playMessage = (item: VoicemailEntry) => {
    const sound = new Sound(item.filePath, '', (error) => {
      if (error) {
        console.warn('Erreur de lecture', error);
        return;
      }
      setPlayingId(item.id);
      sound.play(() => {
        setPlayingId(null);
        sound.release();
      });
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messagerie vocale</Text>
      {messages.length === 0 && (
        <Text style={styles.empty}>Aucun message pour l'instant.</Text>
      )}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => playMessage(item)}>
            <Text style={styles.caller}>{item.caller}</Text>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.playLabel}>
              {playingId === item.id ? '▶ En lecture...' : '▶ Écouter'}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0e0e10' },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 16 },
  empty: { color: '#888', marginTop: 32, textAlign: 'center' },
  card: {
    backgroundColor: '#1a1a1d',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  caller: { color: '#fff', fontSize: 16, fontWeight: '600' },
  date: { color: '#888', fontSize: 12, marginTop: 2 },
  playLabel: { color: '#4da3ff', marginTop: 8, fontWeight: '500' },
});
