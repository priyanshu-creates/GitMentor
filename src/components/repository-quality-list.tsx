// src/components/repository-quality-list.tsx
import type { GitHubRepository } from "@/services/github";
import { Star, Code, ExternalLink, AlertTriangle } from "lucide-react"; // Replaced GitFork with AlertTriangle for quality indication
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict } from 'date-fns'; // Using strict for cleaner output

interface RepositoryQualityListProps {
  repositories: GitHubRepository[];
}

const RepositoryQualityList: React.FC<RepositoryQualityListProps> = ({ repositories }) => {
  if (repositories.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No repositories to display.</p>;
  }

  // Basic quality score - can be expanded
  const getQualityScore = (repo: GitHubRepository): { score: number; feedback: string[] } => {
    let score = 0;
    const feedback: string[] = [];

    if (repo.stars > 50) { score += 3; } 
    else if (repo.stars > 10) { score += 1; }
    else { feedback.push("Low stars count.");}

    const lastUpdateDate = new Date(repo.lastUpdated);
    const monthsSinceUpdate = (new Date().getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSinceUpdate < 3) { score += 2; }
    else if (monthsSinceUpdate < 6) { score +=1; }
    else { feedback.push("Repository not updated recently.");}
    
    // Placeholder for more checks (e.g. has README, license, issues, PRs)
    // For now, a simple check based on language (assuming "null" or empty means less defined)
    if (repo.language && repo.language.toLowerCase() !== 'null' && repo.language.trim() !== '') {
        score +=1;
    } else {
        feedback.push("Language not specified or common (e.g. HTML often implies simple static sites).");
    }


    return { score: Math.min(score, 5), feedback }; // Max score of 5
  };

  const getQualityBadge = (score: number) => {
    if (score >= 4) return <Badge variant="default" className="bg-accent text-accent-foreground">High</Badge>;
    if (score >= 2) return <Badge variant="secondary" className="bg-yellow-500 text-primary-foreground">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };


  return (
    <div className="space-y-3">
      {repositories.map((repo) => {
        const { score, feedback } = getQualityScore(repo);
        return (
          <div key={repo.name} className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-md text-primary flex items-center">
                <Code size={18} className="mr-2 text-accent flex-shrink-0" />
                <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate" title={repo.name}>
                  {repo.name}
                </a>
              </h3>
              <a href={repo.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${repo.name} on GitHub`}>
                <ExternalLink size={16} className="text-muted-foreground hover:text-accent transition-colors flex-shrink-0" />
              </a>
            </div>
            <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-2">
              {repo.language && <Badge variant="outline" className="text-xs">{repo.language}</Badge>}
              <div className="flex items-center">
                <Star size={14} className="mr-1 text-yellow-400" />
                <span>{repo.stars}</span>
              </div>
              <div>
                Updated: {formatDistanceToNowStrict(new Date(repo.lastUpdated), { addSuffix: true })}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Quality:</span>
                {getQualityBadge(score)}
            </div>
            {feedback.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground/80 space-y-0.5">
                    {feedback.slice(0,1).map((fb, i) => ( // Show only first feedback item for brevity
                        <p key={i} className="flex items-center">
                            <AlertTriangle size={12} className="mr-1.5 text-destructive/70 flex-shrink-0"/> {fb}
                        </p>
                    ))}
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RepositoryQualityList;
