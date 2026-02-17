import { Test, TestingModule } from '@nestjs/testing';
import { CompetitionService } from './competition.service';
import { FootballDataService } from '../football-data/football-data.service';
import { DataStatus } from '../common/constants';

describe('CompetitionService', () => {
  let service: CompetitionService;
  let footballDataService: Partial<FootballDataService>;

  const mockCompetitions = [
    { id: 2021, name: 'Premier League', emblem: 'pl.png' },
    { id: 2002, name: 'Bundesliga', emblem: 'bl.png' },
  ];

  const mockMatches = [
    { id: 1, homeTeam: { name: 'Liverpool' }, awayTeam: { name: 'Man City' } },
    { id: 2, homeTeam: { name: 'Arsenal' }, awayTeam: { name: 'Chelsea' } },
  ];

  const mockScorers = [
    { player: { name: 'Haaland' }, goals: 20 },
    { player: { name: 'Salah' }, goals: 15 },
  ];

  beforeEach(async () => {
    footballDataService = {
      getAvailableCompetitions: jest.fn(),
      getCompetition: jest.fn(),
      getCompetitionMatches: jest.fn(),
      getCompetitionScorers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitionService,
        { provide: FootballDataService, useValue: footballDataService },
      ],
    }).compile();

    service = module.get<CompetitionService>(CompetitionService);
  });

  describe('findAll', () => {
    it('should return all available competitions', async () => {
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.findAll();

      expect(result.data).toEqual(mockCompetitions);
      expect(result.status).toBe(DataStatus.FRESH);
    });

    it('should return PROCESSING when data is loading', async () => {
      (footballDataService.getAvailableCompetitions as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 5,
      });

      const result = await service.findAll();

      expect(result.status).toBe(DataStatus.PROCESSING);
      expect(result.retryAfter).toBe(5);
    });
  });

  describe('findById', () => {
    it('should return competition by id', async () => {
      (footballDataService.getCompetition as jest.Mock).mockResolvedValue({
        data: mockCompetitions[0],
        status: DataStatus.FRESH,
      });

      const result = await service.findById(2021);

      expect(result.data).toEqual(mockCompetitions[0]);
      expect(footballDataService.getCompetition).toHaveBeenCalledWith(2021);
    });

    it('should return STALE when data is stale', async () => {
      (footballDataService.getCompetition as jest.Mock).mockResolvedValue({
        data: mockCompetitions[0],
        status: DataStatus.STALE,
      });

      const result = await service.findById(2021);

      expect(result.status).toBe(DataStatus.STALE);
    });
  });

  describe('getMatches', () => {
    it('should return competition matches', async () => {
      (footballDataService.getCompetitionMatches as jest.Mock).mockResolvedValue({
        data: mockMatches,
        status: DataStatus.FRESH,
      });

      const result = await service.getMatches(2021);

      expect(result.data).toEqual(mockMatches);
      expect(footballDataService.getCompetitionMatches).toHaveBeenCalledWith(2021);
    });

    it('should return PROCESSING when matches are loading', async () => {
      (footballDataService.getCompetitionMatches as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 10,
      });

      const result = await service.getMatches(2021);

      expect(result.status).toBe(DataStatus.PROCESSING);
    });
  });

  describe('getScorers', () => {
    it('should return competition scorers', async () => {
      (footballDataService.getCompetitionScorers as jest.Mock).mockResolvedValue({
        data: mockScorers,
        status: DataStatus.FRESH,
      });

      const result = await service.getScorers(2021);

      expect(result.data).toEqual(mockScorers);
      expect(footballDataService.getCompetitionScorers).toHaveBeenCalledWith(2021);
    });

    it('should return STALE when scorers data is stale', async () => {
      (footballDataService.getCompetitionScorers as jest.Mock).mockResolvedValue({
        data: mockScorers,
        status: DataStatus.STALE,
      });

      const result = await service.getScorers(2021);

      expect(result.status).toBe(DataStatus.STALE);
    });
  });
});
