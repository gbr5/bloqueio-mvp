/**
 * Main Router Component
 * 
 * Manages screen navigation between:
 * - HomeScreen: Create/Join/Offline menu
 * - CreateRoom: Room creation flow
 * - JoinRoom: Room joining flow
 * 
 * Lobby and Game are handled by dynamic routes in /room/[code]/*
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HomeScreen } from '@/components/HomeScreen';
import { CreateRoom } from '@/components/CreateRoom';
import { JoinRoom } from '@/components/JoinRoom';

type Screen = 'home' | 'create' | 'join';

export default function RouterPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('home');

  // Navigation handlers
  const goToHome = () => setScreen('home');
  const goToCreate = () => setScreen('create');
  const goToJoin = () => setScreen('join');
  
  const startOfflineGame = () => {
    // For offline mode, use a special route or local state
    router.push('/offline');
  };

  // Screen rendering
  switch (screen) {
    case 'home':
      return (
        <HomeScreen
          onCreateRoom={goToCreate}
          onJoinRoom={goToJoin}
          onPlayOffline={startOfflineGame}
        />
      );

    case 'create':
      return (
        <CreateRoom
          onCancel={goToHome}
        />
      );

    case 'join':
      return (
        <JoinRoom
          onCancel={goToHome}
        />
      );

    default:
      return null;
  }
}
