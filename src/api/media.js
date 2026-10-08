const API_ORIGIN = 'https://api.hrtrac.in';

export const resolveMediaUrl = (value) => {
  if (!value) return null;

  let url = String(value).trim();

  // Handle URLs accidentally returned as markdown links
  // Example: [http://api.hrtrac.in/media/x.png](http://api.hrtrac.in/media/x.png)
  const markdownMatch = url.match(/\]\((https?:\/\/[^)]+)\)/);
  if (markdownMatch) {
    url = markdownMatch[1];
  }

  // Convert HTTP API/media URLs to HTTPS
  if (url.startsWith('http://')) {
    url = `https://${url.slice(7)}`;
  }

  // Convert relative media paths to absolute HTTPS URLs
  if (url.startsWith('/')) {
    url = `${API_ORIGIN}${url}`;
  }

  return url;
};

export default resolveMediaUrl;