import { Test, TestingModule } from '@nestjs/testing';
import { MatchesService } from './matches.service';
import { FootballDataService } from '../football-data/football-data.service';
import { DataStatus } from '../common/constants';

describe('MatchesService', () => {
  let service: MatchesService;
  let footballDataService: Partial<FootballDataService>;

  const mockMatches = [
    {
      id: 1,
      utcDate: '2024-01-15T15:00:00Z',
      status: 'SCHEDULED',
      competition: { id: 2021, name: 'Premier League' },
      homeTeam: { id: 64, name: 'Liverpool' },
      awayTeam: { id: 65, name: 'Manchester City' },
    },
    {
      id: 2,
      utcDate: '2024-01-15T17:30:00Z',
      status: 'FINISHED',
      competition: { id: 2002, name: 'Bundesliga' },
      homeTeam: { id: 5, name: 'Bayern' },
      awayTeam: { id: 6, name: 'Dortmund' },
    },
    {
      id: 3,
      utcDate: '2024-01-15T20:00:00Z',
      status: 'SCHEDULED',
      competition: { id: 9999, name: 'Unknown League' },
      homeTeam: { id: 100, name: 'Team A' },
      awayTeam: { id: 101, name: 'Team B' },
    },
  ];

  const mockCompetitions = [
    { id: 2021, name: 'Premier League' },
    { id: 2002, name: 'Bundesliga' },
  ];

  beforeEach(async () => {
    footballDataService = {
      getMatches: jest.fn(),
      getAvailableCompetitions: jest.fn(),
      getMatch: jest.fn(),
      getHead2Head: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: FootballDataService, useValue: footballDataService },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);
  });

  describe('getMatches', () => {
    it('should return filtered matches for available competitions', async () => {
      (footballDataService.getMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatches({});

      expect(result.status).toBe(DataStatus.FRESH);
      expect(result.data).toHaveLength(2);
      expect(result.data!.map((m) => m.id)).toEqual([1, 2]);
    });

    it('should return PROCESSING when matches are processing', async () => {
      (footballDataService.getMatches as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 5,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatches({});

      expect(result.status).toBe(DataStatus.PROCESSING);
      expect(result.data).toBeNull();
      expect(result.retryAfter).toBe(5);
    });

    it('should return PROCESSING when competitions are processing', async () => {
      (footballDataService.getMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 10,
      });

      const result = await service.getMatches({});

      expect(result.status).toBe(DataStatus.PROCESSING);
      expect(result.retryAfter).toBe(10);
    });

    it('should return max retryAfter when both are processing', async () => {
      (footballDataService.getMatches as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 5,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 10,
      });

      const result = await service.getMatches({});

      expect(result.retryAfter).toBe(10);
    });

    it('should return STALE when matches data is stale', async () => {
      (footballDataService.getMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.STALE,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatches({});

      expect(result.status).toBe(DataStatus.STALE);
    });

    it('should return STALE when competitions data is stale', async () => {
      (footballDataService.getMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.STALE,
      });

      const result = await service.getMatches({});

      expect(result.status).toBe(DataStatus.STALE);
    });

    it('should apply limit correctly', async () => {
      (footballDataService.getMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatches({ limit: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe(1);
    });

    it('should apply offset correctly', async () => {
      (footballDataService.getMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatches({ limit: 1, offset: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe(2);
    });

    it('should pass date to footballDataService', async () => {
      (footballDataService.getMatches as jest.Mock).mockResolvedValue({
        data: [],
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      await service.getMatches({ date: '2024-01-15' });

      expect(footballDataService.getMatches).toHaveBeenCalledWith(new Date('2024-01-15'));
    });
  });

  describe('getMatch', () => {
    it('should return match by id', async () => {
      const mockMatch = { id: 1, status: 'FINISHED' };
      (footballDataService.getMatch as jest.Mock).mockResolvedValue({
        data: mockMatch,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatch(1);

      expect(result.data).toEqual(mockMatch);
      expect(footballDataService.getMatch).toHaveBeenCalledWith(1);
    });
  });

  describe('getHead2Head', () => {
    it('should return head2head data', async () => {
      const mockH2H = { aggregates: { numberOfMatches: 10 } };
      (footballDataService.getHead2Head as jest.Mock).mockResolvedValue({
        data: mockH2H,
        status: DataStatus.FRESH,
      });

      const result = await service.getHead2Head(1);

      expect(result.data).toEqual(mockH2H);
      expect(footballDataService.getHead2Head).toHaveBeenCalledWith(1);
    });
  });
});
