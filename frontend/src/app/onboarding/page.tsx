"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { UploadCloud, CheckCircle2, ArrowRight, Loader2, AlignLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Step 1 State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobLevel, setJobLevel] = useState("");

  // Step 2 State
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
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
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
      // Save step 1 data
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
        {/* Step Indicators */}
        <div className="flex items-center justify-center mb-8 gap-4 px-10">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${step >= 1 ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900' : 'bg-muted text-muted-foreground'}`}>
              1
            </div>
            <span className="text-xs font-medium text-muted-foreground">Profile</span>
          </div>
          <div className={`flex-1 h-px ${step >= 2 ? 'bg-zinc-900 dark:bg-zinc-50' : 'bg-border'}`} />
          <div className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${step >= 2 ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900' : 'bg-muted text-muted-foreground'}`}>
              2
            </div>
            <span className="text-xs font-medium text-muted-foreground">Resume</span>
          </div>
        </div>

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>{step === 1 ? "Let's personalize your experience" : "Upload your master resume"}</CardTitle>
            <CardDescription>
              {step === 1 ? "We use this to filter the best matching opportunities." : "Our AI uses this to calculate match scores and write tailored cover letters."}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-md text-sm">
                {errorMsg}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Job Level Preference</Label>
                  <Select value={jobLevel} onValueChange={(val) => setJobLevel(val || "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your experience level..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Entry Level">Entry Level (0-2 years)</SelectItem>
                      <SelectItem value="Mid Level">Mid Level (3-5 years)</SelectItem>
                      <SelectItem value="Senior">Senior (5+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full mt-6 glow-subtle" onClick={handleNextStep} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue to Resume <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit mx-auto mb-6">
                  <Button size="sm" variant={uploadMode === "file" ? "default" : "ghost"} onClick={() => setUploadMode("file")} className="h-8">PDF / DOCX</Button>
                  <Button size="sm" variant={uploadMode === "text" ? "default" : "ghost"} onClick={() => setUploadMode("text")} className="h-8">Paste Text</Button>
                </div>

                {uploadMode === "file" ? (
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                      isDragActive ? 'border-zinc-500 bg-zinc-500/10' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {file ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex flex-items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 mt-3 ml-3" />
                        </div>
                        <p className="font-semibold text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">Click to replace file</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          <UploadCloud className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">Drop your resume here, or click to browse</p>
                          <p className="text-xs text-muted-foreground">Supports PDF and DOCX files up to 10MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Paste Master Resume</Label>
                    <textarea 
                      className="flex min-h-[250px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Paste your entire resume contents here..."
                      value={manualText}
                      onChange={e => setManualText(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2 w-full">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={loading}>Back</Button>
                  <Button className="flex-1 glow-subtle" onClick={handleFinish} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Setup"}
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
