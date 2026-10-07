/**
 * 相关文章引擎 - 基于 TF-IDF 和标签/分类加权的相似度计算
 * 支持：离线预计算、在线增量更新、缓存、降级策略
 */

interface PostMeta {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags: string[];
  category: string | null;
  date: Date;
  wordCount: number;
}

interface SimilarityResult {
  postId: string;
  score: number;
  reasons: string[]; // 匹配原因：标签、分类、关键词
}

interface RelatedPostsConfig {
  maxResults: number;           // 最大返回数量
  minScore: number;             // 最小相似度阈值
  tagWeight: number;            // 标签权重
  categoryWeight: number;       // 分类权重
  contentWeight: number;        // 内容权重
  titleWeight: number;          // 标题权重
  maxAgeDays: number;           // 最大文章年龄（天）
  excludeCurrent: boolean;      // 排除当前文章
}

const DEFAULT_CONFIG: RelatedPostsConfig = {
  maxResults: 5,
  minScore: 0.1,
  tagWeight: 0.4,
  categoryWeight: 0.2,
  contentWeight: 0.3,
  titleWeight: 0.1,
  maxAgeDays: 730, // 2年
  excludeCurrent: true,
};

// 词频统计
function getTermFrequency(text: string): Map<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // 保留字母数字和空格
    .split(/\s+/)
    .filter(w => w.length > 1);
  
  const tf = new Map<string, number>();
  for (const word of words) {
    tf.set(word, (tf.get(word) || 0) + 1);
  }
  return tf;
}

// 计算 TF-IDF 向量
function computeTFIDF(posts: PostMeta[]): Map<string, Map<string, number>> {
  const docCount = posts.length;
  const df = new Map<string, number>(); // 文档频率
  
  // 计算每个词在多少文档中出现
  for (const post of posts) {
    const tf = getTermFrequency(post.content + " " + post.title);
    for (const word of tf.keys()) {
      df.set(word, (df.get(word) || 0) + 1);
    }
  }
  
  // 计算 TF-IDF
  const vectors = new Map<string, Map<string, number>>();
  for (const post of posts) {
    const tf = getTermFrequency(post.content + " " + post.title);
    const vector = new Map<string, number>();
    
    for (const [word, freq] of tf) {
      const idf = Math.log(docCount / (df.get(word) || 1));
      vector.set(word, freq * idf);
    }
    
    // 归一化
    let magnitude = 0;
    for (const val of vector.values()) {
      magnitude += val * val;
    }
    magnitude = Math.sqrt(magnitude);
    
    if (magnitude > 0) {
      for (const [word, val] of vector) {
        vector.set(word, val / magnitude);
      }
    }
    
    vectors.set(post.id, vector);
  }
  
  return vectors;
}

// 余弦相似度
function cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
  let dotProduct = 0;
  
  for (const [word, val1] of vec1) {
    const val2 = vec2.get(word);
    if (val2 !== undefined) {
      dotProduct += val1 * val2;
    }
  }
  
  return dotProduct;
}

// 标签相似度 (Jaccard 系数)
function tagSimilarity(tags1: string[], tags2: string[]): number {
  const set1 = new Set(tags1.map(t => t.toLowerCase()));
  const set2 = new Set(tags2.map(t => t.toLowerCase()));
  
  let intersection = 0;
  for (const tag of set1) {
    if (set2.has(tag)) intersection++;
  }
  
  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// 计算两篇文章的相似度
export function calculateSimilarity(
  post1: PostMeta,
  post2: PostMeta,
  tfidfVectors: Map<string, Map<string, number>>,
  config: RelatedPostsConfig = DEFAULT_CONFIG
): SimilarityResult {
  const reasons: string[] = [];
  let score = 0;
  
  // 1. 标签相似度
  const tagSim = tagSimilarity(post1.tags, post2.tags);
  if (tagSim > 0) {
    score += tagSim * config.tagWeight;
    const commonTags = post1.tags.filter(t => post2.tags.includes(t));
    if (commonTags.length > 0) {
      reasons.push(`共同标签: ${commonTags.slice(0, 3).join(", ")}`);
    }
  }
  
  // 2. 分类相同
  if (post1.category && post2.category && post1.category === post2.category) {
    score += config.categoryWeight;
    reasons.push(`同分类: ${post1.category}`);
  }
  
  // 3. 内容 TF-IDF 余弦相似度
  const vec1 = tfidfVectors.get(post1.id);
  const vec2 = tfidfVectors.get(post2.id);
  
  if (vec1 && vec2) {
    const contentSim = cosineSimilarity(vec1, vec2);
    if (contentSim > 0) {
      score += contentSim * config.contentWeight;
      if (contentSim > 0.3) {
        reasons.push("内容高度相关");
      } else if (contentSim > 0.15) {
        reasons.push("内容相关");
      }
    }
  }
  
  // 4. 标题相似度
  const titleSim = tagSimilarity(
    post1.title.toLowerCase().split(/\s+/),
    post2.title.toLowerCase().split(/\s+/)
  );
  if (titleSim > 0) {
    score += titleSim * config.titleWeight;
  }
  
  // 年龄衰减
  const ageDays = (Date.now() - post2.date.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > config.maxAgeDays) {
    score *= 0.5; // 老文章权重减半
    reasons.push("较早文章");
  }
  
  return {
    postId: post2.id,
    score: Math.min(1, score), // 限制最大值
    reasons,
  };
}

// 获取相关文章
export function getRelatedPosts(
  currentPost: PostMeta,
  allPosts: PostMeta[],
  config: Partial<RelatedPostsConfig> = {}
): SimilarityResult[] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // 过滤候选文章
  let candidates = allPosts.filter(post => {
    if (mergedConfig.excludeCurrent && post.id === currentPost.id) return false;
    
    const ageDays = (Date.now() - post.date.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > mergedConfig.maxAgeDays) return false;
    
    return true;
  });
  
  if (candidates.length === 0) return [];
  
  // 计算 TF-IDF 向量
  const tfidfVectors = computeTFIDF([currentPost, ...candidates]);
  
  // 计算相似度
  const results: SimilarityResult[] = [];
  
  for (const candidate of candidates) {
    const similarity = calculateSimilarity(currentPost, candidate, tfidfVectors, mergedConfig);
    
    if (similarity.score >= mergedConfig.minScore) {
      results.push(similarity);
    }
  }
  
  // 排序并截取
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, mergedConfig.maxResults);
}

// 离线预计算版本（用于构建时生成）
export async function precomputeRelatedPosts(
  posts: PostMeta[],
  config: RelatedPostsConfig = DEFAULT_CONFIG
): Promise<Map<string, SimilarityResult[]>> {
  const tfidfVectors = computeTFIDF(posts);
  const result = new Map<string, SimilarityResult[]>();
  
  for (const post of posts) {
    const candidates = posts.filter(p => p.id !== post.id);
    const related: SimilarityResult[] = [];
    
    for (const candidate of candidates) {
      const similarity = calculateSimilarity(post, candidate, tfidfVectors, config);
      if (similarity.score >= config.minScore) {
        related.push(similarity);
      }
    }
    
    related.sort((a, b) => b.score - a.score);
    result.set(post.id, related.slice(0, config.maxResults));
  }
  
  return result;
}

// 增量更新（新增文章时）
export function updateRelatedPostsForNewPost(
  newPost: PostMeta,
  existingPosts: PostMeta[],
  existingCache: Map<string, SimilarityResult[]>,
  config: RelatedPostsConfig = DEFAULT_CONFIG
): Map<string, SimilarityResult[]> {
  const newCache = new Map(existingCache);
  const tfidfVectors = computeTFIDF([newPost, ...existingPosts]);
  
  // 为新文章计算相关文章
  const newPostRelated = [];
  for (const post of existingPosts) {
    const similarity = calculateSimilarity(newPost, post, tfidfVectors, config);
    if (similarity.score >= config.minScore) {
      newPostRelated.push(similarity);
    }
  }
  newPostRelated.sort((a, b) => b.score - a.score);
  newCache.set(newPost.id, newPostRelated.slice(0, config.maxResults));
  
  // 更新现有文章的相关列表（如果新文章进入它们的 Top N）
  for (const post of existingPosts) {
    const similarity = calculateSimilarity(post, newPost, tfidfVectors, config);
    
    if (similarity.score >= config.minScore) {
      const existing = newCache.get(post.id) || [];
      const insertIndex = existing.findIndex(r => r.score < similarity.score);
      
      if (insertIndex === -1) {
        if (existing.length < config.maxResults) {
          existing.push(similarity);
        }
      } else {
        existing.splice(insertIndex, 0, similarity);
        if (existing.length > config.maxResults) {
          existing.pop();
        }
      }
      
      newCache.set(post.id, existing);
    }
  }
  
  return newCache;
}

// 导出类型和配置
export type { PostMeta, SimilarityResult, RelatedPostsConfig };
export { DEFAULT_CONFIG };