import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import meowUrl from '../audio/cat-meow.mp3'
import whooshUrl from '../audio/whoosh-short-realistic.mp3'
import './intro.css'

function Cat() {
  return (
    <svg className="intro-cat" viewBox="0 0 240 180" aria-hidden="true">
      <g>
        <path
          className="intro-cat-fur"
          d="M49 118 38 24Q38 15 47 20L88 49Q120 37 151 49L192 20Q201 15 200 26L190 118Q188 154 120 156 53 153 49 118Z"
        />
        <path className="intro-cat-ear" d="m51 37 8 44 20-23Zm137 0-8 44-20-23Z" />
        <path className="intro-cat-stripe" d="m105 45 7 23 8-24 8 24 7-23" />
        <g className="intro-cat-eyes">
          <path d="M76 101q10-14 20 0m48 0q10-14 20 0" />
        </g>
        <path className="intro-cat-nose" d="M113 112q7-4 14 0l-7 7Z" />
        <path className="intro-cat-smile" d="M120 119v5m0 0q-10 10-17 0m17 0q10 10 17 0" />
        <ellipse className="intro-cat-mouth" cx="120" cy="128" rx="8" ry="10" />
        <g className="intro-cat-whiskers">
          <path d="m71 115-28-6m28 16-30 4m128-14 28-6m-28 16 30 4" />
        </g>
        <ellipse className="intro-cat-cheek" cx="79" cy="118" rx="11" ry="5" />
        <ellipse className="intro-cat-cheek" cx="161" cy="118" rx="11" ry="5" />
      </g>
    </svg>
  )
}

function Intro() {
  const [take, setTake] = useState(0)
  const [audioError, setAudioError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const audio = useRef(null)
  const playback = useRef(0)
  const composition = useRef(null)
  const pendingSound = useRef(null)

  useLayoutEffect(() => {
    const prepared = pendingSound.current
    if (!prepared) return undefined
    let cancelled = false
    const animation = composition.current.querySelector('.intro-initial').getAnimations()[0]

    async function synchronize() {
      try {
        if (!animation) throw new Error('Intro animation was not available')
        await animation.ready
        if (cancelled || pendingSound.current !== prepared) return
        if (typeof animation.startTime !== 'number') {
          throw new Error('Intro animation start time was not available')
        }
        const { context, recording, whooshRecording } = prepared
        const output = context.getOutputTimestamp?.()
        // Map the visual start to the audio frame reaching the output device.
        const start =
          output?.performanceTime > 0 && output.contextTime >= 0.05
            ? output.contextTime + (animation.startTime - output.performanceTime) / 1000
            : context.currentTime +
              (animation.startTime - performance.now()) / 1000 -
              (context.baseLatency || 0) -
              (context.outputLatency || 0)
        const whoosh = context.createBufferSource()
        const whooshGain = context.createGain()
        const whooshStart = start + 0.55
        whoosh.buffer = whooshRecording
        whooshGain.gain.setValueAtTime(0, whooshStart)
        whooshGain.gain.linearRampToValueAtTime(1, whooshStart + 0.005)
        whooshGain.gain.setValueAtTime(1, whooshStart + 0.42)
        whooshGain.gain.linearRampToValueAtTime(0, whooshStart + 0.45)
        whoosh.connect(whooshGain).connect(context.destination)
        // Keep the main swell, skipping the low rumble and long tail.
        whoosh.start(whooshStart, 0.65, 0.45)
        const source = context.createBufferSource()
        source.buffer = recording
        source.connect(context.destination)
        source.start(start + 1.9)
        pendingSound.current = null
      } catch (error) {
        if (cancelled || pendingSound.current !== prepared) return
        console.error('Unable to synchronize intro sound', error)
        setAudioError('Could not synchronize intro sound. Replay the intro to try again.')
      }
    }

    void synchronize()
    return () => {
      cancelled = true
    }
  }, [take])

  useEffect(
    () => () => {
      playback.current += 1
      if (audio.current) void audio.current.close()
    },
    [],
  )

  async function replay() {
    const currentPlayback = ++playback.current
    pendingSound.current = null
    setPreparing(true)
    setAudioError('')
    if (audio.current) {
      await audio.current.close()
      audio.current = null
    }

    let context
    let recording
    let whooshRecording
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) {
        setAudioError('Sound is not supported in this browser. The visual preview still works.')
      } else {
        try {
          context = new AudioContext()
          audio.current = context
          await context.resume()
          const [meow, whoosh] = await Promise.all(
            [meowUrl, whooshUrl].map(async (url) => {
              const response = await fetch(url)
              if (!response.ok) {
                throw new Error(`Intro audio request failed (${url}): ${response.status}`)
              }
              return context.decodeAudioData(await response.arrayBuffer())
            }),
          )
          recording = meow
          whooshRecording = whoosh
          if (context.getOutputTimestamp) {
            const waitingSince = performance.now()
            await new Promise((resolve) => {
              function waitForOutput() {
                if (
                  currentPlayback !== playback.current ||
                  context.state !== 'running' ||
                  context.getOutputTimestamp().contextTime >= 0.05 ||
                  performance.now() - waitingSince >= 1000
                ) {
                  resolve()
                  return
                }
                requestAnimationFrame(waitForOutput)
              }
              waitForOutput()
            })
          }
        } catch (error) {
          if (currentPlayback !== playback.current) return
          console.error('Unable to start intro audio', error)
          setAudioError(
            'Could not load or play the intro recordings. Check your connection and audio permissions.',
          )
        }
      }
    }
    if (currentPlayback !== playback.current) return
    if (recording && whooshRecording && context?.state === 'running') {
      pendingSound.current = { context, recording, whooshRecording }
    }
    setPreparing(false)
    setTake((previous) => previous + 1)
  }

  return (
    <main className="intro-preview">
      <div className="intro-grain" aria-hidden="true" />
      <button
        className="intro-stage"
        type="button"
        onClick={replay}
        disabled={preparing}
        aria-label="IamUV intro. Click or press Enter to replay with sound."
        aria-busy={preparing}
      >
        <span className="intro-audio-hint" aria-hidden="true">
          PRESS AGAIN FOR AUDIO
        </span>
        <span className="intro-canvas">
          <span key={take} ref={composition} className="intro-composition" aria-hidden="true">
            <span className="intro-cat-window">
              <Cat />
            </span>
            <span className="intro-paws">
              <span />
              <span />
            </span>
            <span className="intro-wordmark">
              <span className="intro-topbar" />
              <span className="intro-initial-track">
                <span className="intro-initial">I</span>
              </span>
              <span className="intro-reveal">
                am<span>UV</span>
              </span>
            </span>
          </span>
        </span>
      </button>
      {audioError && (
        <p className="intro-error" role="alert">
          {audioError}
        </p>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<Intro />)
