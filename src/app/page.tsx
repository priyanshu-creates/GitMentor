
// src/app/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getGitHubProfile, getGitHubRepositories, getGitHubActivity, type GitHubProfile, type GitHubRepository, type GitHubActivityDay } from "@/services/github";
import { suggestImprovements } from "@/ai/flows/suggest-improvements";
import { answerQuestions, type AnswerQuestionsInput } from "@/ai/flows/answer-questions";
import { suggestProjects } from "@/ai/flows/suggest-projects";
import ActivityHeatmap from "@/components/activity-heatmap";
import LanguageChart from "@/components/language-chart";
import RepositoryQualityList from "@/components/repository-quality-list";
import { ModeToggle } from "@/components/mode-toggle";
import { Github, Search, Loader2, Activity, BarChart3, GraduationCap, MessageCircle, Send, Lightbulb, Sparkles, FolderGit2, Wand2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function GitMentorPage() {
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [currentSearchUsername, setCurrentSearchUsername] = useState<string>("");
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [activity, setActivity] = useState<GitHubActivityDay[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [improvementSuggestions, setImprovementSuggestions] = useState<string>("");
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const [projectIdeas, setProjectIdeas] = useState<string[]>([]);
  const [loadingProjectSuggestions, setLoadingProjectSuggestions] = useState<boolean>(false);
  const [projectSuggestionsError, setProjectSuggestionsError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);


  const { toast } = useToast();

  const fetchGitHubData = useCallback(async (usernameToFetch: string) => {
    if (!usernameToFetch) {
        setErrorMessage("Please enter a GitHub username.");
        toast({
            title: "Input Error",
            description: "GitHub username cannot be empty.",
            variant: "destructive",
        });
        return;
    }
    setLoading(true);
    setErrorMessage(null);
    setProfile(null);
    setRepositories([]);
    setActivity([]);
    setChatMessages([]);
    setImprovementSuggestions("");
    setProjectIdeas([]);
    setCurrentSearchUsername(usernameToFetch);
    setInitialLoad(false); 

    setLoadingSuggestions(true);
    setSuggestionsError(null);
    setLoadingProjectSuggestions(true);
    setProjectSuggestionsError(null);


    try {
      const [profileData, repositoriesData, activityData] = await Promise.all([
        getGitHubProfile(usernameToFetch),
        getGitHubRepositories(usernameToFetch),
        getGitHubActivity(usernameToFetch),
      ]);

      setProfile(profileData);
      setRepositories(repositoriesData);
      setActivity(activityData);
      setErrorMessage(null);

      if (profileData) { 
        toast({
          title: "Profile Loaded!",
          description: `Successfully fetched data for ${profileData.login}.`,
        });
      } else {
         toast({
            title: "Profile Data Missing",
            description: `Could not retrieve profile details for ${usernameToFetch}. Some features may be limited.`,
            variant: "destructive",
        });
      }


      if (profileData && repositoriesData.length > 0) {
        suggestImprovements({ username: profileData.login, profile: profileData, repositories: repositoriesData })
          .then(imprResponse => setImprovementSuggestions(imprResponse.suggestions))
          .catch((aiError: any) => {
            console.error("Error fetching improvement suggestions:", aiError);
            setSuggestionsError(aiError.message || "Could not load improvement suggestions.");
            toast({
                title: "AI Suggestion Error",
                description: aiError.message || "Failed to load improvement suggestions from AI.",
                variant: "destructive",
            });
          })
          .finally(() => setLoadingSuggestions(false));
      } else {
        setLoadingSuggestions(false);
        if (!profileData) {
            setSuggestionsError("Cannot fetch suggestions: Profile data is missing.");
        } else if (repositoriesData.length === 0) {
            setImprovementSuggestions("This user has no public repositories or they could not be analyzed. Suggestions for code/projects cannot be generated without repository data.");
        } else {
            setImprovementSuggestions("Cannot fetch improvement suggestions. Check profile and repository data.");
        }
      }
      
      if (profileData) { // Only suggest projects if profile data is available
        suggestProjects({ username: usernameToFetch })
          .then(projResponse => setProjectIdeas(projResponse.projectSuggestions))
          .catch((aiError: any) => {
            console.error("Error fetching project suggestions:", aiError);
            setProjectSuggestionsError(aiError.message || "Could not load project suggestions.");
             toast({
                title: "AI Project Idea Error",
                description: aiError.message || "Failed to load project ideas from AI.",
                variant: "destructive",
            });
          })
          .finally(() => setLoadingProjectSuggestions(false));
      } else {
        setLoadingProjectSuggestions(false);
        setProjectSuggestionsError("Cannot fetch project suggestions: Profile data is missing.");
      }


    } catch (error: any) {
      console.error("Error fetching GitHub data for user:", usernameToFetch, error);
      
      let toastTitle = "Error Fetching Data";
      let toastDescription = error.message || `An unexpected error occurred while fetching data for "${usernameToFetch}".`;
            
      setErrorMessage(toastDescription);
      toast({
        title: toastTitle,
        description: toastDescription,
        variant: "destructive",
      });
      setProfile(null); 
      setRepositories([]);
      setActivity([]);
      setLoadingSuggestions(false); 
      setLoadingProjectSuggestions(false);
    } finally {
      setLoading(false);
    }
  }, [toast]);


  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedUsername = usernameInput.trim();
    if (!trimmedUsername) {
      setErrorMessage("Please enter a GitHub username.");
      toast({
        title: "Input Error",
        description: "GitHub username cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    fetchGitHubData(trimmedUsername);
  };

  const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentSearchUsername) return;

    setLoadingChat(true);
    setChatError(null);
    const userMessageContent = chatInput;
    setChatInput(""); 

    setChatMessages(prevMessages => [...prevMessages, { role: "user", content: userMessageContent }]);
    
    try {
      const inputForAI: AnswerQuestionsInput = {
        username: currentSearchUsername,
        question: userMessageContent,
      };
      if (profile) { 
        // @ts-ignore 
        inputForAI.profile = profile;
      }
      if (repositories.length > 0) {
        // @ts-ignore
        inputForAI.repositories = repositories;
      }
      const aiResponse = await answerQuestions(inputForAI);
      setChatMessages(prevMessages => [...prevMessages, { role: "assistant", content: aiResponse.answer }]);
    } catch (error: any) {
      console.error("Error getting AI answer:", error);
      setChatError(error.message || "Sorry, I couldn't get an answer. Please try again.");
      toast({
        title: "Chat Error",
        description: error.message || "Failed to get response from AI mentor.",
        variant: "destructive",
      });
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSuggestImprovements = async () => {
    if (!currentSearchUsername || !profile || !repositories.length) {
        toast({ title: "Cannot Suggest Improvements", description: "Load a profile and ensure repositories are available.", variant: "destructive"});
        return;
    }
     if (!repositories.length) {
      toast({ title: "No Repositories", description: "This user has no public repositories to analyze for code/project improvements.", variant: "default"});
      setImprovementSuggestions("This user has no public repositories. Suggestions for code/projects cannot be generated without repository data.");
      setLoadingSuggestions(false); 
      return;
    }


    setLoadingSuggestions(true);
    setSuggestionsError(null);
    try {
      const aiResponse = await suggestImprovements({ username: currentSearchUsername, profile, repositories });
      setImprovementSuggestions(aiResponse.suggestions);
      toast({
        title: "Suggestions Updated!",
        description: "New improvement suggestions are ready."
      });
    } catch (error: any) {
      console.error("Error getting improvement suggestions:", error);
      setSuggestionsError(error.message || "Sorry, I couldn't get improvement suggestions. Please try again.");
      toast({
        title: "Suggestion Error",
        description: error.message || "Failed to load improvement suggestions.",
        variant: "destructive",
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSuggestProjects = async () => {
    if (!currentSearchUsername || !profile) { // Check for profile as well
        toast({ title: "Cannot Suggest Projects", description: "Load a profile first by searching a username.", variant: "destructive"});
        return;
    }
    setLoadingProjectSuggestions(true);
    setProjectSuggestionsError(null); 
    setProjectIdeas([]); 
    try {
      const aiResponse = await suggestProjects({ username: currentSearchUsername });
      setProjectIdeas(aiResponse.projectSuggestions);
      toast({
        title: "Project Ideas Updated!",
        description: "New project ideas are ready."
      });
    }
    catch (error: any) {
      console.error("Error getting project suggestions:", error);
      setProjectSuggestionsError(error.message || "Could not load project suggestions.");
      toast({
        title: "Project Idea Error",
        description: error.message || "Failed to load project ideas.",
        variant: "destructive",
      });
    } finally {
      setLoadingProjectSuggestions(false);
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Example: clear something or close a modal
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  return (
    <div className="flex flex-col min-h-screen bg-secondary text-foreground transition-all duration-500 ease-in-out">
      <header className="bg-primary text-primary-foreground p-4 shadow-md sticky top-0 z-50 transition-all duration-500 ease-in-out">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-8 w-8">
              <path d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"></path>
            </svg>
            <h1 className="text-2xl font-bold">GitMentor</h1>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className={`flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center transition-opacity duration-500 ease-in-out ${
          initialLoad || !profile && !loading && !errorMessage ? 'justify-center' : '' 
        } `}>
        <Card className={`shadow-lg rounded-lg overflow-hidden w-full max-w-lg transition-all duration-500 ease-in-out ${profile || loading || errorMessage ? 'mb-8' : ''}`}>
          <CardHeader className="bg-card-foreground/5 p-6 transition-all duration-500 ease-in-out">
            <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-7 w-7 text-accent">
                <path d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"></path>
              </svg>
              <span>Connect GitHub Account</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground transition-all duration-500 ease-in-out">Enter your GitHub username to analyze your profile and get AI-powered insights.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 transition-all duration-500 ease-in-out">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <Input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter GitHub Username"
                className="flex-grow text-base"
                aria-label="GitHub Username"
              />
              <Button type="submit" disabled={loading} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base px-6 py-3">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Analyze Profile
                  </>
                )}
              </Button>
            </form>
            {errorMessage && <p className="text-destructive mt-4 text-center font-medium">{errorMessage}</p>}
          </CardContent>
        </Card>

        {loading && !profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 mt-8 w-full">
            <Card className="lg:col-span-1 shadow-lg rounded-lg transition-all duration-500 ease-in-out"><CardHeader><CardTitle>Loading Profile...</CardTitle></CardHeader><CardContent><Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" /></CardContent></Card>
            <Card className="lg:col-span-2 shadow-lg rounded-lg transition-all duration-500 ease-in-out"><CardHeader><CardTitle>Loading Activity...</CardTitle></CardHeader><CardContent><Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" /></CardContent></Card>
          </div>
        )}

        {profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 w-full">
            <Card className="lg:col-span-1 shadow-lg rounded-lg overflow-hidden transition-all duration-500 ease-in-out">
              <CardHeader className="flex flex-row items-center space-x-4 bg-card-foreground/5 p-6 transition-all duration-500 ease-in-out">
                <Avatar className="h-20 w-20 border-2 border-accent">
                  <AvatarImage src={profile.avatarUrl} alt={profile.name || profile.login} data-ai-hint="user avatar" />
                  <AvatarFallback className="text-2xl bg-muted text-muted-foreground transition-all duration-500 ease-in-out">{profile.login.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl font-bold">{profile.name || profile.login}</CardTitle>
                  <CardDescription className="text-muted-foreground hover:text-accent transition-all duration-500 ease-in-out">
                    <a href={`https://github.com/${profile.login}`} target="_blank" rel="noopener noreferrer">
                      @{profile.login}
                    </a>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 transition-all duration-500 ease-in-out">
                <p className="text-muted-foreground mb-4 text-sm transition-all duration-500 ease-in-out">{profile.bio || "No bio available."}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground transition-all duration-500 ease-in-out">Followers:</span><span className="font-semibold">{profile.followers}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground transition-all duration-500 ease-in-out">Following:</span><span className="font-semibold">{profile.following}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground transition-all duration-500 ease-in-out">Public Repos:</span><span className="font-semibold">{profile.publicRepos}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground transition-all duration-500 ease-in-out">Joined:</span><span className="font-semibold">{new Date(profile.joined).toLocaleDateString()}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-lg rounded-lg overflow-hidden transition-all duration-500 ease-in-out">
              <CardHeader className="bg-card-foreground/5 p-6 transition-all duration-500 ease-in-out">
                <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
                  <Activity className="h-6 w-6 text-accent" />
                  <span>Activity Heatmap</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground transition-all duration-500 ease-in-out">Your GitHub contribution activity over the past year.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 transition-all duration-500 ease-in-out">
                {activity.length > 0 ? (
                  <ActivityHeatmap data={activity} />
                ) : (
                  <p className="text-muted-foreground text-center py-8 transition-all duration-500 ease-in-out">No activity data available to display heatmap.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {profile && repositories.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 w-full">
            <Card className="shadow-lg rounded-lg overflow-hidden transition-all duration-500 ease-in-out">
              <CardHeader className="bg-card-foreground/5 p-6 transition-all duration-500 ease-in-out">
                <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
                  <BarChart3 className="h-6 w-6 text-accent" />
                  <span>Language Trends</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground transition-all duration-500 ease-in-out">Distribution of programming languages across your repositories.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 min-h-[300px] flex items-center justify-center transition-all duration-500 ease-in-out">
                <LanguageChart repositories={repositories} />
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-lg overflow-hidden transition-all duration-500 ease-in-out">
              <CardHeader className="bg-card-foreground/5 p-6 transition-all duration-500 ease-in-out">
                <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
                  <GraduationCap className="h-6 w-6 text-accent" />
                  <span>Top Repositories</span>
                </CardTitle>
                 <CardDescription className="text-muted-foreground transition-all duration-500 ease-in-out">Overview of your most starred repositories.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 transition-all duration-500 ease-in-out">
                <RepositoryQualityList repositories={repositories.sort((a,b) => b.stars - a.stars).slice(0,5)} />
              </CardContent>
            </Card>
          </div>
        )}

        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 w-full">
            <Card className="shadow-lg rounded-lg overflow-hidden transition-all duration-500 ease-in-out">
              <CardHeader className="bg-card-foreground/5 p-6 transition-all duration-500 ease-in-out">
                <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
                  <Lightbulb className="h-6 w-6 text-accent" />
                  <span>AI Improvement Suggestions</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground transition-all duration-500 ease-in-out">Get AI-powered suggestions to enhance your GitHub profile and projects.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Button 
                  onClick={handleSuggestImprovements} 
                  disabled={loadingSuggestions || !profile || repositories.length === 0 } 
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base mb-4 px-6 py-3"
                >
                  {loadingSuggestions ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  Suggest Improvements
                </Button>
                {profile && repositories.length === 0 && !loadingSuggestions && (
                  <p className="text-xs text-muted-foreground mt-2 text-center transition-all duration-500 ease-in-out">
                    This user has no public repositories, so improvement suggestions for code/projects cannot be generated.
                  </p>
                )}
                {suggestionsError && <p className="text-destructive text-sm mb-2">{suggestionsError}</p>}
                <ScrollArea className="h-[20rem] w-full rounded-md border bg-muted/50 p-4 text-sm max-w-none transition-all duration-500 ease-in-out">
                   <div className="prose prose-sm max-w-none min-h-full dark:prose-invert">
                  { (improvementSuggestions && !loadingSuggestions) ? (
                      <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} /> }}>{improvementSuggestions}</ReactMarkdown>
                    ) : loadingSuggestions ? (
                      <div className="flex items-center justify-center h-full text-center p-4"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground italic">Click "Suggest Improvements" to get AI feedback.</p> 
                      </div>
                    )
                  }
                  </div>
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-lg overflow-hidden transition-all duration-500 ease-in-out">
              <CardHeader className="bg-card-foreground/5 p-6 transition-all duration-500 ease-in-out">
                <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
                  <FolderGit2 className="h-6 w-6 text-accent" />
                   <span>AI Project Ideas</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground transition-all duration-500 ease-in-out">Discover new project ideas tailored to your skills and interests.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                 <Button 
                    onClick={handleSuggestProjects} 
                    disabled={loadingProjectSuggestions || !profile} 
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base mb-4 px-6 py-3"
                  >
                  {loadingProjectSuggestions ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                  Suggest New Projects
                </Button>
                {projectSuggestionsError && <p className="text-destructive text-sm mb-2">{projectSuggestionsError}</p>}
                <ScrollArea className="h-[20rem] w-full rounded-md border bg-muted/50 p-4 text-sm max-w-none transition-all duration-500 ease-in-out">
                  <div className="prose prose-sm max-w-none min-h-full dark:prose-invert">
                    {loadingProjectSuggestions && projectIdeas.length === 0 && (
                        <div className="flex items-center justify-center h-full text-center p-4"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
                    )}
                    {!loadingProjectSuggestions && projectIdeas.length === 0 && !projectSuggestionsError && (
                       <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground italic text-center">Click "Suggest New Projects" to get ideas.</p>
                      </div>
                    )}
                    {projectIdeas.length > 0 && !loadingProjectSuggestions && (
                      <ul className="space-y-2 text-sm list-disc list-inside">
                        {projectIdeas.map((idea, index) => (
                          <li key={index} className="p-1 transition-all duration-500 ease-in-out">{idea}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
        
        {profile && (
          <Card className="shadow-lg rounded-lg overflow-hidden w-full transition-all duration-500 ease-in-out">
            <CardHeader className="bg-card-foreground/5 p-6 transition-all duration-500 ease-in-out">
              <CardTitle className="flex items-center space-x-2 text-xl md:text-2xl">
                <MessageCircle className="h-6 w-6 text-accent" />
                <span>AI Mentor Chat</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground transition-all duration-500 ease-in-out">Ask questions about your profile, coding practices, or career path.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 transition-all duration-500 ease-in-out">
              <ScrollArea className="h-80 w-full border rounded-md p-4 mb-4 bg-background space-y-4 scroll-smooth transition-all duration-500 ease-in-out">
                {chatMessages.length === 0 && <p className="text-muted-foreground text-center italic transition-all duration-500 ease-in-out">Ask your AI mentor anything!</p>}
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-xl shadow-sm transition-all duration-500 ease-in-out ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} /> }} className="prose prose-sm max-w-none text-inherit dark:prose-invert">{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                 {loadingChat && (
                    <div className="flex justify-start">
                        <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg bg-muted text-muted-foreground transition-all duration-500 ease-in-out">
                            <Loader2 className="h-5 w-5 animate-spin text-accent" />
                        </div>
                    </div>
                )}
                <ScrollBar orientation="vertical" />
              </ScrollArea>
              <form onSubmit={handleChatSubmit} className="flex gap-4">
                <Input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-grow text-base"
                  aria-label="Chat input"
                  disabled={loadingChat}
                />
                <Button type="submit" disabled={loadingChat || !chatInput.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base px-6 py-3">
                  {loadingChat ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                  Send
                </Button>
              </form>
              {chatError && <p className="text-destructive mt-2 text-sm">{chatError}</p>}
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="bg-primary text-primary-foreground p-6 text-center text-sm mt-auto transition-all duration-500 ease-in-out">
        <p>&copy; {new Date().getFullYear()} GitMentor. All rights reserved.</p>
        <p>Powered by AI and the GitHub API. Not affiliated with GitHub, Inc.</p>
      </footer>
    </div>
  );
}

