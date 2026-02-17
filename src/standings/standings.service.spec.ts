import { Test, TestingModule } from '@nestjs/testing';
import { StandingsService } from './standings.service';
import { FootballDataService } from '../football-data/football-data.service';
import { DataStatus } from '../common/constants';

describe('StandingsService', () => {
  let service: StandingsService;
  let footballDataService: Partial<FootballDataService>;

  const mockStandings = {
    competition: { id: 2021, name: 'Premier League' },
    standings: [
      {
        type: 'TOTAL',
        table: [
          { position: 1, team: { name: 'Liverpool' }, points: 50 },
          { position: 2, team: { name: 'Man City' }, points: 48 },
        ],
      },
    ],
  };

  beforeEach(async () => {
    footballDataService = {
      getCompetitionStandings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandingsService,
        { provide: FootballDataService, useValue: footballDataService },
      ],
    }).compile();

    service = module.get<StandingsService>(StandingsService);
  });

  describe('getCompetitionStandings', () => {
    it('should return competition standings', async () => {
      (footballDataService.getCompetitionStandings as jest.Mock).mockResolvedValue({
        data: mockStandings,
        status: DataStatus.FRESH,
      });

      const result = await service.getCompetitionStandings(2021);

      expect(result.data).toEqual(mockStandings);
      expect(result.status).toBe(DataStatus.FRESH);
      expect(footballDataService.getCompetitionStandings).toHaveBeenCalledWith(2021);
    });

    it('should return PROCESSING when data is loading', async () => {
      (footballDataService.getCompetitionStandings as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
        retryAfter: 5,
      });

      const result = await service.getCompetitionStandings(2021);

      expect(result.status).toBe(DataStatus.PROCESSING);
      expect(result.data).toBeNull();
      expect(result.retryAfter).toBe(5);
    });

    it('should return STALE when data is stale', async () => {
      (footballDataService.getCompetitionStandings as jest.Mock).mockResolvedValue({
        data: mockStandings,
        status: DataStatus.STALE,
      });

      const result = await service.getCompetitionStandings(2021);

      expect(result.status).toBe(DataStatus.STALE);
      expect(result.data).toEqual(mockStandings);
    });
  });
});
