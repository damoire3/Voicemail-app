import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';

const audioRecorderPlayer = new AudioRecorderPlayer();
const GREETING_PATH = `${RNFS.DocumentDirectoryPath}/greeting.m4a`;

export default function GreetingScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasGreeting, setHasGreeting] = useState(false);
  const [duration, setDuration] = useState('00:00');

  const requestMicPermission = async () => {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startRecording = async () => {
    const ok = await requestMicPermission();
    if (!ok) {
      Alert.alert('Permission refusée', "Le micro est nécessaire pour enregistrer le message d'accueil.");
      return;
    }
    await audioRecorderPlayer.startRecorder(GREETING_PATH);
    audioRecorderPlayer.addRecordBackListener((e) => {
      setDuration(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
    });
    setIsRecording(true);
  };

  const stopRecording = async () => {
    await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();
    setIsRecording(false);
    setHasGreeting(true);
  };

  const playGreeting = async () => {
    if (!hasGreeting) return;
    await audioRecorderPlayer.startPlayer(GREETING_PATH);
    setIsPlaying(true);
    audioRecorderPlayer.addPlayBackListener((e) => {
      if (e.currentPosition >= e.duration) {
        audioRecorderPlayer.stopPlayer();
        audioRecorderPlayer.removePlayBackListener();
        setIsPlaying(false);
      }
    });
  };

  const deleteGreeting = async () => {
    const exists = await RNFS.exists(GREETING_PATH);
    if (exists) await RNFS.unlink(GREETING_PATH);
    setHasGreeting(false);
    setDuration('00:00');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Message d'accueil</Text>
      <Text style={styles.subtitle}>
        Ce message sera joué à l'appelant avant l'enregistrement.
      </Text>

      <View style={styles.circleWrap}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? '■' : '●'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.duration}>{duration}</Text>
      </View>

      {hasGreeting && !isRecording && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={playGreeting}>
            <Text style={styles.actionText}>
              {isPlaying ? '▶ Lecture...' : '▶ Écouter'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={deleteGreeting}>
            <Text style={styles.actionText}>🗑 Supprimer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0e0e10', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 24 },
  subtitle: { color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 40 },
  circleWrap: { alignItems: 'center' },
  recordButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#e63946',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: { backgroundColor: '#ff6b6b' },
  recordButtonText: { color: '#fff', fontSize: 32 },
  duration: { color: '#ccc', marginTop: 12, fontSize: 16 },
  actions: { flexDirection: 'row', marginTop: 40, gap: 12 },
  actionButton: {
    backgroundColor: '#1a1a1d',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  deleteButton: { backgroundColor: '#2a1616' },
  actionText: { color: '#fff', fontWeight: '600' },
});
