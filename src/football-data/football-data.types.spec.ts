import {
  CACHE_CONFIG,
  getMatchesCacheConfig,
  FootballJobType,
  getJobId,
  getCacheKey,
  getPathAndTtl,
  extractResponseData,
} from './football-data.types';

describe('football-data.types', () => {
  describe('getMatchesCacheConfig', () => {
    it('should return MATCHES_TODAY config when no date provided', () => {
      const result = getMatchesCacheConfig();
      expect(result).toEqual(CACHE_CONFIG.MATCHES_TODAY);
    });

    it('should return MATCHES_TODAY config for today', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = getMatchesCacheConfig(today);
      expect(result).toEqual(CACHE_CONFIG.MATCHES_TODAY);
    });

    it('should return MATCHES_PAST config for past dates', () => {
      const pastDate = '2020-01-01';
      const result = getMatchesCacheConfig(pastDate);
      expect(result).toEqual(CACHE_CONFIG.MATCHES_PAST);
    });

    it('should return MATCHES_FUTURE config for future dates', () => {
      const futureDate = '2030-01-01';
      const result = getMatchesCacheConfig(futureDate);
      expect(result).toEqual(CACHE_CONFIG.MATCHES_FUTURE);
    });
  });

  describe('getJobId', () => {
    it('should return competition job id', () => {
      const result = getJobId({ type: FootballJobType.COMPETITION, competitionId: 2021 });
      expect(result).toBe('competition_2021');
    });

    it('should return competition matches job id', () => {
      const result = getJobId({ type: FootballJobType.COMPETITION_MATCHES, competitionId: 2021 });
      expect(result).toBe('competition_matches_2021');
    });

    it('should return standings job id', () => {
      const result = getJobId({ type: FootballJobType.COMPETITION_STANDINGS, competitionId: 2021 });
      expect(result).toBe('standings_2021');
    });

    it('should return scorers job id', () => {
      const result = getJobId({ type: FootballJobType.COMPETITION_SCORERS, competitionId: 2021 });
      expect(result).toBe('scorers_2021');
    });

    it('should return matches job id with date', () => {
      const result = getJobId({ type: FootballJobType.MATCHES, date: '2024-01-15' });
      expect(result).toBe('matches_2024-01-15');
    });

    it('should return matches_all job id without date', () => {
      const result = getJobId({ type: FootballJobType.MATCHES });
      expect(result).toBe('matches_all');
    });

    it('should return match job id', () => {
      const result = getJobId({ type: FootballJobType.MATCH, matchId: 123 });
      expect(result).toBe('match_123');
    });

    it('should return head2head job id', () => {
      const result = getJobId({ type: FootballJobType.HEAD2HEAD, matchId: 123 });
      expect(result).toBe('head2head_123');
    });

    it('should return team job id', () => {
      const result = getJobId({ type: FootballJobType.TEAM, teamId: 64 });
      expect(result).toBe('team_64');
    });

    it('should return team matches job id', () => {
      const result = getJobId({ type: FootballJobType.TEAM_MATCHES, teamId: 64 });
      expect(result).toBe('team_matches_64');
    });

    it('should return available_competitions job id', () => {
      const result = getJobId({ type: FootballJobType.AVAILABLE_COMPETITIONS });
      expect(result).toBe('available_competitions');
    });
  });

  describe('getCacheKey', () => {
    it('should return same value as getJobId', () => {
      const data = { type: FootballJobType.COMPETITION, competitionId: 2021 };
      expect(getCacheKey(data)).toBe(getJobId(data));
    });
  });

  describe('getPathAndTtl', () => {
    it('should return path and ttl for COMPETITION', () => {
      const result = getPathAndTtl({ type: FootballJobType.COMPETITION, competitionId: 2021 });
      expect(result.path).toBe('/competitions/2021');
      expect(result.ttl).toBe(CACHE_CONFIG.COMPETITION.ttl);
    });

    it('should return path and ttl for COMPETITION_MATCHES', () => {
      const result = getPathAndTtl({ type: FootballJobType.COMPETITION_MATCHES, competitionId: 2021 });
      expect(result.path).toBe('/competitions/2021/matches');
      expect(result.ttl).toBe(CACHE_CONFIG.COMPETITION_MATCHES.ttl);
    });

    it('should return path and ttl for COMPETITION_STANDINGS', () => {
      const result = getPathAndTtl({ type: FootballJobType.COMPETITION_STANDINGS, competitionId: 2021 });
      expect(result.path).toBe('/competitions/2021/standings');
      expect(result.ttl).toBe(CACHE_CONFIG.STANDINGS.ttl);
    });

    it('should return path and ttl for COMPETITION_SCORERS', () => {
      const result = getPathAndTtl({ type: FootballJobType.COMPETITION_SCORERS, competitionId: 2021 });
      expect(result.path).toBe('/competitions/2021/scorers');
      expect(result.ttl).toBe(CACHE_CONFIG.COMPETITION_SCORERS.ttl);
    });

    it('should return path and ttl for MATCHES with date', () => {
      const result = getPathAndTtl({ type: FootballJobType.MATCHES, date: '2024-01-15' });
      expect(result.path).toBe('/matches?dateFrom=2024-01-15&dateTo=2024-01-16');
    });

    it('should return path and ttl for MATCHES without date', () => {
      const result = getPathAndTtl({ type: FootballJobType.MATCHES });
      expect(result.path).toBe('/matches');
    });

    it('should return path and ttl for MATCH', () => {
      const result = getPathAndTtl({ type: FootballJobType.MATCH, matchId: 123 });
      expect(result.path).toBe('/matches/123');
      expect(result.ttl).toBe(CACHE_CONFIG.MATCH.ttl);
    });

    it('should return path and ttl for HEAD2HEAD', () => {
      const result = getPathAndTtl({ type: FootballJobType.HEAD2HEAD, matchId: 123 });
      expect(result.path).toBe('/matches/123/head2head');
      expect(result.ttl).toBe(CACHE_CONFIG.HEAD2HEAD.ttl);
    });

    it('should return path and ttl for TEAM', () => {
      const result = getPathAndTtl({ type: FootballJobType.TEAM, teamId: 64 });
      expect(result.path).toBe('/teams/64');
      expect(result.ttl).toBe(CACHE_CONFIG.TEAM.ttl);
    });

    it('should return path and ttl for TEAM_MATCHES', () => {
      const result = getPathAndTtl({ type: FootballJobType.TEAM_MATCHES, teamId: 64 });
      expect(result.path).toBe('/teams/64/matches');
      expect(result.ttl).toBe(CACHE_CONFIG.TEAM_MATCHES.ttl);
    });

    it('should return path and ttl for AVAILABLE_COMPETITIONS', () => {
      const result = getPathAndTtl({ type: FootballJobType.AVAILABLE_COMPETITIONS });
      expect(result.path).toBe('/competitions');
      expect(result.ttl).toBe(CACHE_CONFIG.COMPETITIONS_LIST.ttl);
    });
  });

  describe('extractResponseData', () => {
    it('should extract matches from COMPETITION_MATCHES response', () => {
      const response = { matches: [{ id: 1 }, { id: 2 }] };
      const result = extractResponseData(FootballJobType.COMPETITION_MATCHES, response);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should extract matches from TEAM_MATCHES response', () => {
      const response = { matches: [{ id: 1 }] };
      const result = extractResponseData(FootballJobType.TEAM_MATCHES, response);
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should extract matches from MATCHES response', () => {
      const response = { matches: [{ id: 1 }, { id: 2 }, { id: 3 }] };
      const result = extractResponseData(FootballJobType.MATCHES, response);
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should extract competitions from AVAILABLE_COMPETITIONS response', () => {
      const response = { competitions: [{ id: 2021, name: 'PL' }] };
      const result = extractResponseData(FootballJobType.AVAILABLE_COMPETITIONS, response);
      expect(result).toEqual([{ id: 2021, name: 'PL' }]);
    });

    it('should extract scorers from COMPETITION_SCORERS response', () => {
      const response = { scorers: [{ player: 'Haaland' }] };
      const result = extractResponseData(FootballJobType.COMPETITION_SCORERS, response);
      expect(result).toEqual([{ player: 'Haaland' }]);
    });

    it('should return full response for MATCH', () => {
      const response = { id: 123, homeTeam: 'Liverpool' };
      const result = extractResponseData(FootballJobType.MATCH, response);
      expect(result).toEqual(response);
    });

    it('should return full response for HEAD2HEAD', () => {
      const response = { aggregates: { numberOfMatches: 10 } };
      const result = extractResponseData(FootballJobType.HEAD2HEAD, response);
      expect(result).toEqual(response);
    });

    it('should return full response for COMPETITION', () => {
      const response = { id: 2021, name: 'Premier League' };
      const result = extractResponseData(FootballJobType.COMPETITION, response);
      expect(result).toEqual(response);
    });
  });
});
