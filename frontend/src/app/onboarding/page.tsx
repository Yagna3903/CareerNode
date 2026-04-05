"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { UploadCloud, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobLevel, setJobLevel] = useState("");

  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        if (!loading) router.push("/login");
      } else {
        setSessionToken(data.session.access_token);
      }
    });
  }, [router, loading, supabase.auth]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const handleNextStep = async () => {
    setErrorMsg("");
    if (!firstName || !lastName || !jobLevel) {
      setErrorMsg("Please fill out your name and job preference.");
      return;
    }
    setLoading(true);
    try {
      if (sessionToken) {
        await api.saveUserContext(sessionToken, {
          first_name: firstName,
          last_name: lastName,
          phone_number: phone,
          job_level_preference: jobLevel
        });
      }
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setErrorMsg("");
    if (uploadMode === "file" && !file) {
      setErrorMsg("Please upload your resume file.");
      return;
    }
    if (uploadMode === "text" && manualText.trim().length < 50) {
      setErrorMsg("Please paste a valid resume.");
      return;
    }

    setLoading(true);
    try {
      if (!sessionToken) throw new Error("Not authenticated");
      if (uploadMode === "file" && file) {
        await api.uploadResume(sessionToken, file);
      } else if (uploadMode === "text") {
        await api.saveUserContext(sessionToken, { master_resume_text: manualText });
      }
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative isolate">
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-purple-500/5 via-background/50 to-background pointer-events-none -z-10" />
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-xl">
          {/* Step Indicators */}
          <div className="flex items-center justify-center mb-10 gap-4 px-10">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${step >= 1 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground border border-border'}`}>
                1
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Profile</span>
            </div>
            <div className={`flex-1 h-px ${step >= 2 ? 'bg-foreground' : 'bg-border'}`} />
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${step >= 2 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground border border-border'}`}>
                2
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Resume</span>
            </div>
          </div>

          <Card className="shadow-2xl border-border bg-card/80 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border pb-6 pt-8">
              <CardTitle className="text-2xl font-extrabold tracking-tight">
                {step === 1 ? "Initialize Identity" : "Upload Context Matrix"}
              </CardTitle>
              <CardDescription className="text-sm font-medium mt-1">
                {step === 1 ? "Establishing baseline targeting vectors for the ingestion engine." : "Our LLM engine requires absolute context mapping to score matches accurately."}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-8">
              {errorMsg && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-semibold tracking-wide">
                  {errorMsg}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-[13px] font-bold">First Name</Label>
                      <Input id="first_name" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name" className="text-[13px] font-bold">Last Name</Label>
                      <Input id="last_name" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} className="h-11 rounded-lg" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[13px] font-bold">Terminal Comms (Optional)</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} className="h-11 rounded-lg text-muted-foreground" />
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-[13px] font-bold">Target Seniority Vector</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setJobLevel("Internship")}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${jobLevel === "Internship" ? "border-purple-500 bg-purple-500/5 shadow-md shadow-purple-500/10" : "border-border hover:border-border/80 hover:bg-muted bg-transparent"}`}
                      >
                        <div className="font-extrabold mb-1 text-[14px]">Internship</div>
                        <div className="text-[12px] font-medium text-muted-foreground">Summer / Co-op block</div>
                      </div>
                      <div 
                        onClick={() => setJobLevel("Entry Level")}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 ${jobLevel === "Entry Level" ? "border-purple-500 bg-purple-500/5 shadow-md shadow-purple-500/10" : "border-border hover:border-border/80 hover:bg-muted bg-transparent"}`}
                      >
                        <div className="font-extrabold mb-1 text-[14px]">Entry Level</div>
                        <div className="text-[12px] font-medium text-muted-foreground">0-2 years exposure</div>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full mt-8 h-12 rounded-xl font-bold tracking-wider text-sm shadow-md" onClick={handleNextStep} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Initialize Phase 2 <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mx-auto mb-8 border border-border">
                    <Button size="sm" variant={uploadMode === "file" ? "default" : "ghost"} onClick={() => setUploadMode("file")} className="h-9 px-6 rounded-lg font-bold">File Matrix</Button>
                    <Button size="sm" variant={uploadMode === "text" ? "default" : "ghost"} onClick={() => setUploadMode("text")} className="h-9 px-6 rounded-lg font-bold">Raw Text</Button>
                  </div>

                  {uploadMode === "file" ? (
                    <div 
                      {...getRootProps()} 
                      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                        isDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-border hover:border-foreground/30 hover:bg-muted/50 bg-card'
                      }`}
                    >
                      <input {...getInputProps()} />
                      {file ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex flex-items-center justify-center border border-emerald-500/20 shadow-inner">
                            <CheckCircle2 className="w-7 h-7 mt-3.5 ml-3.5" />
                          </div>
                          <p className="font-bold text-[15px]">{file.name}</p>
                          <p className="text-[12px] font-semibold tracking-wider uppercase text-muted-foreground">Click block to re-select matrix</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border">
                            <UploadCloud className="w-6 h-6 text-foreground/70" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-[14px]">Drag module here or click to browse</p>
                            <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-widest mt-1">.PDF / .DOCX &bull; 10MB Limit</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-[13px] font-bold">Raw Matrix Input</Label>
                      <textarea 
                        className="flex min-h-[250px] w-full rounded-xl border border-border bg-background px-4 py-3 text-[13px] font-mono shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                        placeholder="Paste your entire resume contents explicitly mapped here..."
                        value={manualText}
                        onChange={e => setManualText(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-4 pt-4 w-full border-t border-border mt-8">
                    <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setStep(1)} disabled={loading}>Retreat</Button>
                    <Button className="flex-1 h-12 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg" onClick={handleFinish} disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize Protocol"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
