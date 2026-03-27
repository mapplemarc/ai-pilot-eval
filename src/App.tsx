import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { 
  ClipboardCheck, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Send,
  Loader2,
  TrendingUp,
  Zap,
  ShieldCheck,
  Users,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { EvaluationStep, UseCaseData, INITIAL_DATA } from './types';
import { RSM_AI_STRATEGY, STEPS_CONFIG } from './constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState<UseCaseData>(INITIAL_DATA);
  const [inputValue, setInputValue] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'agent' | 'user', content: string }[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isEvaluating]);

  const startEvaluation = () => {
    setIsStarted(true);
    setChatHistory([
      { role: 'agent', content: "Hello! I'm your AI Pilot Evaluator. I'll guide you through a structured 9-step process to evaluate your AI use case for the marketing department. Let's start with Step 1." },
      { role: 'agent', content: STEPS_CONFIG[0].question }
    ]);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isEvaluating) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    
    const currentStep = STEPS_CONFIG[currentStepIndex];
    await processStep(currentStep.id as EvaluationStep, userMessage);
  };

  const processStep = async (step: EvaluationStep, message: string) => {
    setIsEvaluating(true);
    
    try {
      const newData = { ...data };
      let agentFollowUp = "";
      let nextStepIndex = currentStepIndex;

      switch (step) {
        case EvaluationStep.OWNER:
          newData.owner = message;
          nextStepIndex = 1;
          break;

        case EvaluationStep.OVERVIEW:
          const extractionPrompt = `
            Extract the Use Case Name from this message: "${message}"
            Return as JSON: { "name": "..." }
          `;
          
          // Run extraction and fit evaluation in parallel to save time
          const [extractionResponse, fitResult] = await Promise.all([
            ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: extractionPrompt,
              config: { responseMimeType: "application/json" }
            }),
            evaluateStrategicFit(message)
          ]);

          const { name } = JSON.parse(extractionResponse.text || '{}');
          newData.name = name || "Untitled Use Case";
          newData.overview = message;
          newData.strategicFit = fitResult;
          nextStepIndex = 3; // Move to Scalability (skipping Strategic Fit placeholder)
          
          agentFollowUp = `**Identified:**\n- Use Case: ${newData.name}\n\n**Strategic Fit Determination: ${fitResult.determination}**\n\n${fitResult.explanation}`;
          
          if (fitResult.determination === 'Not Aligned') {
            agentFollowUp += "\n\nNote: This use case currently appears 'Not Aligned' with our strategy. We will continue the evaluation to gather more data, but please consider how this might be pivoted to better align with RSM's goals.";
          }
          break;

        case EvaluationStep.SCALABILITY:
          newData.scalability = message;
          nextStepIndex = 4;
          break;

        case EvaluationStep.EFFICIENCY:
          newData.efficiency.impact = message;
          nextStepIndex = 5;
          break;

        case EvaluationStep.REVENUE:
          newData.revenue.forecast = message;
          nextStepIndex = 6;
          break;

        case EvaluationStep.EXPERIENCE:
          newData.experience = message;
          nextStepIndex = 7;
          break;

        case EvaluationStep.WORKFLOW:
          newData.workflow = message;
          nextStepIndex = 8;
          break;

        case EvaluationStep.DATA_READINESS:
          newData.dataReadiness = message;
          nextStepIndex = 9;
          break;
      }

      setData(newData);

      // 2. Generate the next question or final scorecard
      if (nextStepIndex < STEPS_CONFIG.length) {
        const nextStepConfig = STEPS_CONFIG[nextStepIndex];
        const prevStepConfig = STEPS_CONFIG[currentStepIndex];
        
        const conversationPrompt = `
          You are the 'AI Pilot Evaluator'. 
          
          The user just provided an answer for the step: "${prevStepConfig.title}".
          Their response was: "${message}"
          
          Your task:
          1. Briefly acknowledge their answer to "${prevStepConfig.title}".
          2. If there was an automated evaluation result provided below, incorporate it into your acknowledgement.
          3. Then, provide the question for the NEXT step: "${nextStepConfig.title}".
          
          Next Step Question: "${nextStepConfig.question}"
          
          Context:
          - We are following a structured 9-step discovery.
          - DO NOT confuse raw numbers provided by the user (like volume, frequency, or hours) with a "score". You are not assigning scores yet; you are gathering data.
          - For example, if a user says "10" for monthly volume, acknowledge it as "10 executions per month", not a "score of 10".
          - If the user mentioned they don't have a current process (especially for workflow or efficiency), acknowledge that this is a new design and pivot the question to focus on the planned design to evaluate complexity.
          - Be professional, analytical, and encouraging.
          
          ${agentFollowUp ? `Automated Evaluation Result: ${agentFollowUp}` : ''}
          
          Return as JSON: { "acknowledgment": "string", "nextQuestion": "string" }
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: conversationPrompt,
          config: { responseMimeType: "application/json" }
        });

        try {
          const { acknowledgment, nextQuestion } = JSON.parse(response.text || '{}');
          setChatHistory(prev => [
            ...prev, 
            { role: 'agent', content: acknowledgment || "Got it. Let's move to the next step." },
            { role: 'agent', content: nextQuestion || nextStepConfig.question }
          ]);
        } catch (e) {
          setChatHistory(prev => [...prev, { role: 'agent', content: response.text || "I'm sorry, I had trouble generating the next question. Let's move to the next step." }]);
        }
        setCurrentStepIndex(nextStepIndex);
      } else if (nextStepIndex === STEPS_CONFIG.length) {
        const finalResult = await generateFinalScorecard(newData);
        setData(finalResult);
        setCurrentStepIndex(STEPS_CONFIG.length);
        
        let saveMessage = "";
        try {
          const saveResponse = await fetch('/api/save-to-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: finalResult })
          });
          const saveResult = await saveResponse.json();
          console.log("Google Sheets save status:", saveResult);
          
          if (saveResult.status === 'skipped') {
            saveMessage = "\n\n*(Note: Could not save to Google Sheets. Please check that your AI Studio Secrets are configured correctly.)*";
          } else if (saveResult.error) {
            saveMessage = `\n\n*(Note: Google Sheets Error: ${saveResult.details || 'Unknown error'}. Please verify your setup.)*`;
          }
        } catch (e) {
          console.error("Failed to save to sheet", e);
          saveMessage = "\n\n*(Note: A network error occurred while trying to save to Google Sheets.)*";
        }

        setChatHistory(prev => [
          ...prev, 
          { role: 'agent', content: "Thank you for providing all the details. I have completed the evaluation." },
          { role: 'agent', content: `**Final Recommendation: ${finalResult.recommendation}**\n\n${finalResult.summary}${saveMessage}` }
        ]);
      }
    } catch (error: any) {
      console.error("Error processing step:", error);
      let errorMessage = "I encountered an error. Please try again.";
      
      const errorString = (error?.message || '') + ' ' + (typeof error === 'object' ? JSON.stringify(error) : String(error));
      if (errorString.includes('429') || errorString.includes('quota') || errorString.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "⚠️ **API Quota Exceeded**\n\nYou have exceeded your Gemini API quota. Please check your Google Cloud billing details or wait until your quota resets. If you are on the free tier, you may have hit the daily limit.";
      }
      
      setChatHistory(prev => [...prev, { role: 'agent', content: errorMessage }]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const evaluateStrategicFit = async (overview: string) => {
    const prompt = `
      Evaluate the following AI use case overview against the RSM Marketing AI Strategy.
      
      ${RSM_AI_STRATEGY}
      
      Use Case Overview: "${overview}"
      
      Provide your determination: 'Aligned', 'Somewhat Aligned', or 'Not Aligned'.
      Explain why, referencing specific points from the RSM AI strategy.
      
      Return as JSON: { "determination": "...", "explanation": "..." }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || '{}');
  };

  const generateFinalScorecard = async (currentData: UseCaseData) => {
    const prompt = `
      Act as a senior AI transformation consultant. Evaluate the following business case data and provide a scorecard.
      
      Data: ${JSON.stringify(currentData)}
      
      Rules for scoring:
      1. Business Criticality (1-10): High if it has strategic fit, high scale, and drives one of: cost/time savings, revenue growth, or improved experience.
      2. Implementation Complexity (1-10): Based on workflow complexity and data readiness.
      
      Recommendation: 'Pursue', 'Park', 'Pivot', or 'Park but discuss with your champion on next steps'.
      - All use cases MUST be Aligned or Somewhat Aligned to proceed with 'Pursue'.
      - SPECIAL RULE: If Strategic Fit is 'Not Aligned' BUT Business Criticality (Impact) is high (>=7), Scalability is high, and Implementation Complexity is low (<=4), the recommendation MUST be 'Park but discuss with your champion on next steps'.
      - If 'Park' or 'Pivot', explain that it's not currently approved and advise contacting their champion.
      
      Return as JSON: { 
        "scores": { "businessCriticality": number, "implementationComplexity": number },
        "recommendation": "string",
        "summary": "string"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(response.text || '{}');
    return { ...currentData, ...result };
  };

  const reset = () => {
    setCurrentStepIndex(0);
    setData(INITIAL_DATA);
    setIsStarted(false);
    setChatHistory([]);
  };

  return (
    <div className="min-h-screen rsm-gradient flex items-center justify-center p-4 md:p-8">
      <AnimatePresence mode="wait">
        {!isStarted ? (
          <motion.div 
            key="entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl w-full glass-card p-8 md:p-16 text-center text-white"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-8"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              AI Pilot Evaluator
            </motion.div>
            
            <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
              The Why of AI
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
              Evaluate your AI use case to ensure it's a strategic fit and capable of being executed.
            </p>
            
            <button 
              onClick={startEvaluation}
              className="group flex items-center gap-3 mx-auto px-8 py-4 bg-white text-rsm-teal-dark rounded-full font-bold text-lg hover:bg-emerald-400 hover:text-white transition-all shadow-2xl shadow-black/20"
            >
              Start Discovery
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-5xl h-[90vh] glass-card flex flex-col overflow-hidden"
          >
            {/* Chat Header */}
            <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <ClipboardCheck className="text-emerald-400 w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">AI Pilot Evaluator</h2>
                  <div className="flex gap-1.5 mt-1">
                    {STEPS_CONFIG.map((_, i) => (
                      <div 
                        key={i} 
                        className={`progress-dot ${
                          i === currentStepIndex ? 'progress-dot-active' : 
                          i < currentStepIndex ? 'progress-dot-completed' : 'progress-dot-inactive'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button 
                onClick={reset}
                className="text-white/50 hover:text-white transition-colors p-2"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </header>

            {/* Chat Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
            >
              <AnimatePresence mode="popLayout">
                {chatHistory.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[85%] p-5 rounded-3xl text-sm md:text-base leading-relaxed
                      ${msg.role === 'user' 
                        ? 'chat-bubble-user' 
                        : 'chat-bubble-agent'}
                    `}>
                      <div className="whitespace-pre-wrap">
                        {msg.content.split('\n').map((line, j) => (
                          <p key={j} className={line.startsWith('**') ? 'font-bold mb-3 text-lg' : 'mb-2'}>
                            {line.replace(/\*\*/g, '')}
                          </p>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isEvaluating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="chat-bubble-agent p-5 flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-rsm-teal" />
                      <span className="text-sm font-medium text-slate-500 italic">Analyzing response...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chat Input or Results */}
            {currentStepIndex < STEPS_CONFIG.length ? (
              <div className="p-8 bg-black/10 border-t border-white/10 shrink-0">
                <div className="max-w-3xl mx-auto relative">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type your response..."
                    className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-5 pr-16 text-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all resize-none h-20"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isEvaluating}
                    className="absolute right-4 bottom-4 p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-emerald-500/20"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-black/20 border-t border-white/10 shrink-0 overflow-y-auto max-h-[50vh]">
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                      <BarChart3 className="text-emerald-400 w-8 h-8 mb-4" />
                      <span className="text-3xl font-bold text-white">{data.scores.businessCriticality}/10</span>
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Impact</span>
                    </div>
                    
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                      <Layers className="text-amber-400 w-8 h-8 mb-4" />
                      <span className="text-3xl font-bold text-white">{data.scores.implementationComplexity}/10</span>
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Complexity</span>
                    </div>

                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                        data.recommendation === 'Pursue' ? 'bg-emerald-500/20' : 
                        data.recommendation?.includes('discuss') ? 'bg-blue-500/20' : 'bg-white/10'
                      }`}>
                        {data.recommendation === 'Pursue' ? (
                          <Zap className="text-emerald-400 w-6 h-6" />
                        ) : data.recommendation?.includes('discuss') ? (
                          <Users className="text-blue-400 w-6 h-6" />
                        ) : (
                          <AlertCircle className="text-white/60 w-6 h-6" />
                        )}
                      </div>
                      <span className={`font-bold text-white leading-tight ${
                        (data.recommendation?.length || 0) > 10 ? 'text-xl' : 'text-3xl'
                      }`}>{data.recommendation}</span>
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Recommendation</span>
                    </div>
                  </div>

                  {/* 2D Axis Chart */}
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      Priority Matrix: Impact vs Complexity
                    </h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                          <XAxis 
                            type="number" 
                            dataKey="complexity" 
                            name="Complexity" 
                            domain={[0, 10]} 
                            stroke="rgba(255,255,255,0.4)"
                            label={{ value: 'Complexity', position: 'insideBottom', offset: -10, fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="impact" 
                            name="Impact" 
                            domain={[0, 10]} 
                            stroke="rgba(255,255,255,0.4)"
                            label={{ value: 'Impact', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                          />
                          <ZAxis type="number" range={[400, 400]} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                          />
                          <ReferenceLine x={5} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                          <ReferenceLine y={5} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                          <Scatter 
                            name="Use Case" 
                            data={[{ 
                              impact: data.scores.businessCriticality, 
                              complexity: data.scores.implementationComplexity,
                              name: data.name 
                            }]} 
                            fill="#10b981"
                          >
                            {[{ 
                              impact: data.scores.businessCriticality, 
                              complexity: data.scores.implementationComplexity 
                            }].map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={
                                  data.recommendation === 'Pursue' ? '#10b981' : 
                                  data.recommendation?.includes('discuss') ? '#60a5fa' : '#f59e0b'
                                } 
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6 text-[10px] uppercase tracking-widest font-bold text-white/30">
                      <div className="text-left">Low Complexity</div>
                      <div className="text-right">High Complexity</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
