const API_ORIGIN = 'https://api.hrtrac.in';

export const resolveMediaUrl = (value) => {
  if (!value || typeof value !== 'string') return null;

  let url = value.trim();
  if (!url) return null;

  // Markdown link: [http://x/y.png](http://x/y.png)
  const markdownMatch = url.match(/\]\((https?:\/\/[^)]+)\)/);
  if (markdownMatch) url = markdownMatch[1];

  // //api.hrtrac.in/media/x.png
  if (url.startsWith('//')) url = `https:${url}`;

  // http -> https (Android cleartext block karta hai)
  if (url.startsWith('http://')) url = `https://${url.slice(7)}`;

  // /media/x.png  ya  media/x.png
  if (!/^(https?:|file:|content:|data:)/i.test(url)) {
    url = `${API_ORIGIN}/${url.replace(/^\/+/, '')}`;
  }

  return url.replace(/ /g, '%20');
};

export default resolveMediaUrl;