/**
 * Represents a GitHub repository.
 */
export interface GitHubRepository {
  /**
   * The name of the repository.
   */
  name: string;
  /**
   * The URL of the repository.
   */
  url: string;
  /**
   * The primary language used in the repository.
   */
  language: string | null; // Language can be null
  /**
   * The number of stars the repository has.
   */
  stars: number;
  /**
   * The date the repository was last updated.
   */
  lastUpdated: string;
}

/**
 * Represents a user's GitHub profile.
 */
export interface GitHubProfile {
  /**
   * The user's login name.
   */
  login: string;
  /**
   * The URL of the user's avatar.
   */
  avatarUrl: string;
  /**
   * The user's full name.
   */
  name: string | null; // Name can be null
  /**
   * The user's bio.
   */
  bio: string | null; // Bio can be null
  /**
   * The number of public repositories the user has.
   */
  publicRepos: number;
  /**
   * The number of followers the user has.
   */
  followers: number;
  /**
   * The number of users the user is following.
   */
  following: number;
  /**
   * The date the user joined GitHub.
   */
  joined: string;
}

/**
 * Represents GitHub activity for a specific day.
 */
export interface GitHubActivityDay {
  /**
   * The date of the activity.
   */
  date: string;
  /**
   * The number of contributions made on that day.
   */
  contributions: number;
}

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const commonHeaders: HeadersInit = {
  'Accept': 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

if (GITHUB_TOKEN) {
  commonHeaders['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
}


/**
 * Asynchronously retrieves a user's GitHub profile.
 *
 * @param username The GitHub username of the profile to retrieve.
 * @returns A promise that resolves to a GitHubProfile object.
 */
export async function getGitHubProfile(username: string): Promise<GitHubProfile> {
  const response = await fetch(`${GITHUB_API_BASE}/users/${username}`, { headers: commonHeaders });
  if (!response.ok) {
    const statusText = response.statusText || "No status text";
    if (response.status === 404) {
      throw new Error(`GitHub user "${username}" not found.`);
    }
    if (response.status === 401 || response.status === 403) {
      let detailedMessage = `Failed to fetch GitHub profile for ${username}: ${response.status} ${statusText}.`;
      if (GITHUB_TOKEN) {
        detailedMessage += " This usually means the provided GITHUB_TOKEN is invalid, expired, or lacks the necessary 'user' scope. Please verify your token and its permissions on GitHub. Ensure the token is correctly set in your .env file and the server has been restarted.";
      } else {
        detailedMessage += " This may be due to GitHub API rate limits or lack of authentication. Please set a GITHUB_TOKEN in your .env file to increase the limit and authenticate requests.";
      }
      throw new Error(detailedMessage);
    }
    throw new Error(`Failed to fetch GitHub profile for ${username}: ${response.status} ${statusText}`);
  }
  const data = await response.json();
  return {
    login: data.login,
    avatarUrl: data.avatar_url,
    name: data.name,
    bio: data.bio,
    publicRepos: data.public_repos,
    followers: data.followers,
    following: data.following,
    joined: data.created_at,
  };
}

/**
 * Asynchronously retrieves a user's GitHub repositories.
 *
 * @param username The GitHub username of the repositories to retrieve.
 * @returns A promise that resolves to an array of GitHubRepository objects.
 */
export async function getGitHubRepositories(username: string): Promise<GitHubRepository[]> {
  const response = await fetch(`${GITHUB_API_BASE}/users/${username}/repos?type=owner&sort=updated&per_page=100`, { headers: commonHeaders });
  if (!response.ok) {
    const statusText = response.statusText || "No status text";
    if (response.status === 404 && GITHUB_TOKEN) {
       // If authenticated and 404, it might mean the user has no repos or we can't access them.
       // For simplicity, we'll return an empty array, as this is a valid state.
       console.warn(`GitHub repositories not found for user "${username}" or no public repositories accessible. Returning empty list.`);
       return [];
    }
    if (response.status === 401 || response.status === 403) {
      let detailedMessage = `Failed to fetch GitHub repositories for ${username}: ${response.status} ${statusText}.`;
      if (GITHUB_TOKEN) {
        detailedMessage += " This usually means the provided GITHUB_TOKEN is invalid, expired, or lacks the necessary 'public_repo' or 'repo' scope. Please verify your token and its permissions on GitHub. Ensure the token is correctly set in your .env file and the server has been restarted.";
      } else {
        detailedMessage += " This may be due to GitHub API rate limits or lack of authentication. Please set a GITHUB_TOKEN in your .env file to increase the limit and authenticate requests.";
      }
      throw new Error(detailedMessage);
    }
    throw new Error(`Failed to fetch GitHub repositories for ${username}: ${response.status} ${statusText}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    console.warn(`Expected an array of repositories for ${username}, but received:`, data);
    return [];
  }
  return data.map((repo: any) => ({
    name: repo.name,
    url: repo.html_url,
    language: repo.language,
    stars: repo.stargazers_count,
    lastUpdated: repo.updated_at,
  }));
}


/**
 * Asynchronously retrieves a user's GitHub activity data (simplified).
 * This is a simplified version based on public events, not the detailed contribution graph.
 *
 * @param username The GitHub username of the activity to retrieve.
 * @returns A promise that resolves to an array of GitHubActivityDay objects.
 */
export async function getGitHubActivity(username: string): Promise<GitHubActivityDay[]> {
  const eventsResponse = await fetch(`${GITHUB_API_BASE}/users/${username}/events/public?per_page=100`, { headers: commonHeaders });
  if (!eventsResponse.ok) {
    const statusText = eventsResponse.statusText || "No status text";
    // For activity, we can be more lenient. If it fails, generate empty activity.
    console.warn(`Could not fetch public events for ${username}: ${eventsResponse.status} ${statusText}. Returning empty activity data.`);
    return generateYearOfEmptyActivity();
  }
  const events = await eventsResponse.json();

  const activityMap = new Map<string, number>();

  if (Array.isArray(events)) {
    events.forEach((event: any) => {
      if (event.created_at) {
        const date = event.created_at.split('T')[0]; // YYYY-MM-DD
        activityMap.set(date, (activityMap.get(date) || 0) + 1);
      }
    });
  }
  
  const activityForYear: GitHubActivityDay[] = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    activityForYear.push({
      date: dateString,
      contributions: activityMap.get(dateString) || 0,
    });
  }
  
  return activityForYear.reverse();
}

function generateYearOfEmptyActivity(): GitHubActivityDay[] {
  const activity: GitHubActivityDay[] = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    activity.push({ date: dateString, contributions: 0 });
  }
  return activity.reverse();
}
