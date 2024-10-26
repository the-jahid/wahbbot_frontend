'use client'

import { useState, useRef, useEffect } from "react"
// import Image from "next/image"
import axios from 'axios'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IoSend, IoMic, IoMicOff } from "react-icons/io5"
import { RiRobot3Line } from "react-icons/ri"
import { LuUser } from "react-icons/lu"
import { MdSwapHoriz, MdDelete } from "react-icons/md"
import { FaMinus } from "react-icons/fa"
import { RxCross1 } from "react-icons/rx"
import { extractLinks } from "@/lib/extractlink"
import { removeLinksFromText } from "@/lib/removeLinkFromText"

export default function AdvancedVoicebot() {
  const [showBot, setShowBot] = useState(false)
  const [voiceOutput, setVoiceOutput] = useState(false)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const [language, setLanguage] = useState('en-US')
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [onListening, setOnListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [modal, setModal] = useState(false)
  const [textLinks, setTextLinks] = useState([])
  const [swap, setSwap] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const audioRef = useRef(null)

  const isOdd = messages.length % 2 !== 0

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const stopAudio = () => {
    audioRef.current.pause()
    setSpeaking(false)
  }

  const sendTextToFlowise = async (text) => {
    setIsBotThinking(true)
    const url = 'https://wahbbot-server.onrender.com/api/text-to-text'
    const data = { question: text }

    const usertext = { text, sender: 'user' }
    setMessages([...messages, usertext])
    setText('')

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

     
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      setIsBotThinking(false)

      const botText = {
        text: result.text,
        sender: 'bot'
      }

      setMessages(prevMessages => [...prevMessages, botText])

   
    } catch (error) {
      console.error('Error:', error)
      setIsBotThinking(false)
    }
  }

  const runSpeechRecognition = () => {
    let recognition = null

    if (!recognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognition = new SpeechRecognition()
    }

    recognition.lang = language

    recognition.onstart = () => {
      setOnListening(true)
    }

    recognition.onspeechend = () => {
      recognition.stop()
      setOnListening(false)
    }

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      const usertext = { text: transcript, sender: 'user' }
      setMessages([...messages, usertext])

      try {
        const res = await axios.post('https://wahbbot-server.onrender.com/api/text-to-audio-file', {
          question: transcript,
          language,
        })

        const botText = {
          text: res.data.response.text,
          sender: 'bot',
        }

        setMessages((prevMessages) => [...prevMessages, botText])

        setSpeaking(true)
        const arrayBuffer = new Uint8Array(res.data.audioResponse.data).buffer
        const blob = new Blob([arrayBuffer], { type: 'audio/mp3' })
        const url = URL.createObjectURL(blob)

        audioRef.current = new Audio(url)
        audioRef.current.play()

        audioRef.current.onended = () => {
          setSpeaking(false)
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }

    recognition.start()
  }

  const clearAllMessages = () => {
    setMessages([])
    setShowBot(false)
    setModal(false)
  }

  const MessageBubble = ({ message }) => (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-md p-4 rounded-lg ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
        <p>{message.text}</p>
      </div>
    </div>
  )

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">AI Voice Assistant</CardTitle>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={() => setShowBot(!showBot)}>
            <FaMinus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setModal(true)}>
            <RxCross1 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {showBot && (
        <CardContent>
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
              <ScrollArea className="h-[400px] w-full pr-4">
                {messages.map((msg, index) => (
                  <MessageBubble key={index} message={msg} />
                ))}
                {isBotThinking && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-secondary p-4 rounded-lg">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>
              <form onSubmit={(e) => { e.preventDefault(); sendTextToFlowise(text); }} className="flex items-center space-x-2 mt-4">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <Button type="submit" size="icon">
                  <IoSend className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="voice">
              <div className="flex flex-col items-center justify-center space-y-4 h-[400px]">
                {speaking ? (
                  <div className="w-32 h-32 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-primary rounded-full animate-ping"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-primary rounded-full animate-pulse"></div>
                    </div>
                    <RiRobot3Line className="absolute inset-0 w-full h-full text-primary-foreground" />
                  </div>
                ) : (
                  <RiRobot3Line className="h-32 w-32 text-primary" />
                )}
                <Button
                  variant={onListening ? "destructive" : "default"}
                  size="lg"
                  onClick={runSpeechRecognition}
                >
                  {onListening ? <IoMicOff className="h-6 w-6" /> : <IoMic className="h-6 w-6" />}
                  {onListening ? "Stop Listening" : "Start Listening"}
                </Button>
                {speaking && (
                  <Button variant="outline" onClick={stopAudio}>
                    Stop Audio
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-between items-center mt-4">
            <select
              className="border rounded-md p-2"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en-US">English</option>
              <option value="ar">Arabic</option>
            </select>
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" onClick={() => setVoiceOutput(!voiceOutput)}>
                <MdSwapHoriz className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={clearAllMessages}>
                <MdDelete className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-64">
            <p className="text-lg font-semibold mb-4">Delete all history?</p>
            <div className="flex justify-end space-x-4">
              <Button variant="destructive" onClick={clearAllMessages}>Yes</Button>
              <Button variant="outline" onClick={() => setModal(false)}>No</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}