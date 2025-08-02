import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';

const YouTubePlayer = ({ 
    videoId, 
    episodeId, 
    onProgress, 
    onComplete, 
    initialPosition = 0,
    width = '100%',
    height = '100%'
}) => {
    const { user, token } = useAuth();
    const playerRef = useRef(null);
    const playerInstanceRef = useRef(null); // Store the actual player instance
    const intervalRef = useRef(null);
    const lastSavedProgress = useRef(0);
    const [player, setPlayer] = useState(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [error, setError] = useState(null);

    // Save progress function
    const saveProgress = async (timestampPosition, watchedPercentage) => {
        if (!user || !token || !episodeId) {
            return;
        }

        const payload = {
            episode_id: episodeId,
            timestamp_position: Math.max(0, Math.floor(timestampPosition)),
            watched_percentage: Math.min(100, Math.max(0, Math.round(watchedPercentage * 100) / 100))
        };

        try {
            const response = await apiFetch('/api/watch/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                
                if (onProgress) {
                    onProgress(timestampPosition, watchedPercentage, data.completed);
                }
                
                if (data.completed && onComplete) {
                    onComplete();
                }
            }
        } catch (err) {
            console.error('Error saving progress:', err);
        }
    };

    // Start progress tracking
    const startProgressTracking = () => {
        // Check each condition individually
        if (!user || !token || intervalRef.current) {
            return;
        }

        // Use the ref for immediate access to the player
        const activePlayer = playerInstanceRef.current || player;
        if (!activePlayer) {
            // Try again in a bit in case the player is still initializing
            setTimeout(() => {
                startProgressTracking();
            }, 500);
            return;
        }

        intervalRef.current = setInterval(() => {
            // Use the ref for immediate access
            const currentPlayer = playerInstanceRef.current || player;
            if (!currentPlayer) {
                return;
            }

            try {
                const currentTime = currentPlayer.getCurrentTime();
                const duration = currentPlayer.getDuration();
                
                if (duration > 0) {
                    const watchedPercentage = (currentTime / duration) * 100;
                    
                    // Save progress if there's meaningful change (more than 2% or 10 seconds)
                    if (Math.abs(watchedPercentage - lastSavedProgress.current) >= 2 || 
                        Math.abs(currentTime - (lastSavedProgress.current * duration / 100)) >= 10) {
                        
                        saveProgress(Math.floor(currentTime), watchedPercentage);
                        lastSavedProgress.current = watchedPercentage;
                    }
                }
            } catch (err) {
                console.error('Error tracking progress:', err);
            }
        }, 9000); // Save every 9 seconds
    };

    // Stop progress tracking
    const stopProgressTracking = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    // Handle video completion
    const handleVideoComplete = () => {
        if (!user || !token || !episodeId || !player) return;

        try {
            const duration = player.getDuration();
            saveProgress(Math.floor(duration), 100);
        } catch (err) {
            console.error('Error handling video completion:', err);
        }
    };

    // Player event handlers
    const handlePlayerReady = (event) => {
        // Ensure the ref is set from the event target
        if (event.target && !playerInstanceRef.current) {
            playerInstanceRef.current = event.target;
        }
        
        setPlayerReady(true);
        setError(null);

        // Seek to initial position if provided
        if (initialPosition > 0) {
            setTimeout(() => {
                try {
                    event.target.seekTo(initialPosition, true);
                } catch (err) {
                    console.error('Error seeking to initial position:', err);
                }
            }, 1000);
        }
    };

    const handlePlayerStateChange = (event) => {
        const playerState = event.data;
        
        // Ensure we have the player reference
        if (event.target && !playerInstanceRef.current) {
            playerInstanceRef.current = event.target;
        }
        
        if (playerState === window.YT.PlayerState.PLAYING) {
            startProgressTracking();
        } else {
            stopProgressTracking();
        }

        if (playerState === window.YT.PlayerState.ENDED) {
            handleVideoComplete();
        }
    };

    const handlePlayerError = (event) => {
        console.error('YouTube player error:', event.data);
        setError('Video playback error occurred');
        stopProgressTracking();
    };

    // Load YouTube iframe API
    useEffect(() => {
        if (window.YT && window.YT.Player) {
            return;
        }

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Set up the callback for when the API is ready
        window.onYouTubeIframeAPIReady = () => {
            // API loaded
        };

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Initialize player when API is ready
    useEffect(() => {
        const initPlayer = () => {
            if (!window.YT || !window.YT.Player || !playerRef.current) {
                return;
            }

            try {
                const newPlayer = new window.YT.Player(playerRef.current, {
                    width,
                    height,
                    videoId,
                    playerVars: {
                        autoplay: 1,
                        controls: 1,
                        modestbranding: 1,
                        rel: 0,
                        enablejsapi: 1,
                        origin: window.location.origin
                    },
                    events: {
                        onReady: handlePlayerReady,
                        onStateChange: handlePlayerStateChange,
                        onError: handlePlayerError
                    }
                });

                setPlayer(newPlayer);
                playerInstanceRef.current = newPlayer; // Store in ref for immediate access
            } catch (err) {
                console.error('Error initializing YouTube player:', err);
                setError('Failed to initialize video player');
            }
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            const checkAPI = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(checkAPI);
                    initPlayer();
                }
            }, 100);

            return () => clearInterval(checkAPI);
        }

        // Cleanup function
        return () => {
            stopProgressTracking();
        };
    }, [videoId, width, height]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopProgressTracking();
            if (player && typeof player.destroy === 'function') {
                try {
                    player.destroy();
                } catch (err) {
                    console.error('Error destroying player:', err);
                }
            }
            playerInstanceRef.current = null;
        };
    }, [player]);

    if (error) {
        return (
            <div className="video-error">
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>
                    Reload Page
                </button>
            </div>
        );
    }

    return (
        <div className="youtube-player-container">
            <div ref={playerRef} />
        </div>
    );
};

export default YouTubePlayer;
