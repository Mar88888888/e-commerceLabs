import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from './teams.service';
import { FootballDataService } from '../football-data/football-data.service';
import { DataStatus } from '../common/constants';

describe('TeamService', () => {
  let service: TeamService;
  let footballDataService: Partial<FootballDataService>;

  const mockTeam = {
    id: 64,
    name: 'Liverpool FC',
    crest: 'https://crests.football-data.org/64.png',
    runningCompetitions: [
      { id: 2021, name: 'Premier League' },
      { id: 2001, name: 'Champions League' },
      { id: 9999, name: 'Unknown Cup' },
    ],
  };

  const mockCompetitions = [
    { id: 2021, name: 'Premier League' },
    { id: 2001, name: 'Champions League' },
  ];

  const mockMatches = [
    {
      id: 1,
      competition: { id: 2021, name: 'Premier League' },
      homeTeam: { id: 64, name: 'Liverpool' },
      awayTeam: { id: 65, name: 'Man City' },
    },
    {
      id: 2,
      competition: { id: 9999, name: 'Unknown Cup' },
      homeTeam: { id: 64, name: 'Liverpool' },
      awayTeam: { id: 100, name: 'Unknown Team' },
    },
  ];

  beforeEach(async () => {
    footballDataService = {
      getTeam: jest.fn(),
      getAvailableCompetitions: jest.fn(),
      getTeamMatches: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: FootballDataService, useValue: footballDataService },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  describe('getById', () => {
    it('should return team with filtered competitions', async () => {
      (footballDataService.getTeam as jest.Mock).mockResolvedValue({
        data: { ...mockTeam },
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getById(64);

      expect(result.status).toBe(DataStatus.FRESH);
      expect(result.data!.runningCompetitions).toHaveLength(2);
      expect(result.data!.runningCompetitions!.map((c) => c.id)).toEqual([2021, 2001]);
    });

    it('should return PROCESSING when team data is processing', async () => {
      (footballDataService.getTeam as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 5,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getById(64);

      expect(result.status).toBe(DataStatus.PROCESSING);
      expect(result.data).toBeNull();
      expect(result.retryAfter).toBe(5);
    });

    it('should return PROCESSING when competitions are processing', async () => {
      (footballDataService.getTeam as jest.Mock).mockResolvedValue({
        data: mockTeam,
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 10,
      });

      const result = await service.getById(64);

      expect(result.status).toBe(DataStatus.PROCESSING);
      expect(result.retryAfter).toBe(10);
    });

    it('should return max retryAfter when both are processing', async () => {
      (footballDataService.getTeam as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 5,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 15,
      });

      const result = await service.getById(64);

      expect(result.retryAfter).toBe(15);
    });

    it('should return STALE when team data is stale', async () => {
      (footballDataService.getTeam as jest.Mock).mockResolvedValue({
        data: { ...mockTeam },
        status: DataStatus.STALE,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getById(64);

      expect(result.status).toBe(DataStatus.STALE);
    });

    it('should return STALE when competitions are stale', async () => {
      (footballDataService.getTeam as jest.Mock).mockResolvedValue({
        data: { ...mockTeam },
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.STALE,
      });

      const result = await service.getById(64);

      expect(result.status).toBe(DataStatus.STALE);
    });

    it('should handle team without runningCompetitions', async () => {
      const teamWithoutComps = { id: 64, name: 'Liverpool FC' };
      (footballDataService.getTeam as jest.Mock).mockResolvedValue({
        data: teamWithoutComps,
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getById(64);

      expect(result.data).toEqual(teamWithoutComps);
    });
  });

  describe('getMatches', () => {
    it('should return filtered matches for available competitions', async () => {
      (footballDataService.getTeamMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatches(64);

      expect(result.status).toBe(DataStatus.FRESH);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe(1);
    });

    it('should return PROCESSING when matches are processing', async () => {
      (footballDataService.getTeamMatches as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 5,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatches(64);

      expect(result.status).toBe(DataStatus.PROCESSING);
      expect(result.retryAfter).toBe(5);
    });

    it('should return PROCESSING when competitions are processing', async () => {
      (footballDataService.getTeamMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.FRESH,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 10,
      });

      const result = await service.getMatches(64);

      expect(result.status).toBe(DataStatus.PROCESSING);
      expect(result.retryAfter).toBe(10);
    });

    it('should return STALE when any data is stale', async () => {
      (footballDataService.getTeamMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.STALE,
      });
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatches(64);

      expect(result.status).toBe(DataStatus.STALE);
    });
  });
});
