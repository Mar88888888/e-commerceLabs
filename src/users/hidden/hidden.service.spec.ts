import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceUnavailableException } from '@nestjs/common';
import { HiddenService } from './hidden.service';
import { UserHiddenComp } from './user.hiddencomp.entity';
import { CompetitionService } from '../../competitions/competition.service';
import { UsersService } from '../users.service';
import { DataStatus } from '../../common/constants';

describe('HiddenService', () => {
  let service: HiddenService;
  let hiddenCompRepo: Partial<Repository<UserHiddenComp>>;
  let compService: Partial<CompetitionService>;
  let usersService: Partial<UsersService>;

  const mockCompetitions = [
    { id: 2021, name: 'Premier League', emblem: 'pl.png' },
    { id: 2002, name: 'Bundesliga', emblem: 'bl.png' },
  ];

  const mockHiddenComps = [
    { id: 1, competitionId: 2021, name: 'Premier League', emblem: 'pl.png', user: { id: 1 } },
    { id: 2, competitionId: 9999, name: 'Unknown League', emblem: 'uk.png', user: { id: 1 } },
  ];

  beforeEach(async () => {
    hiddenCompRepo = {
      find: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
    };

    compService = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    usersService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HiddenService,
        { provide: getRepositoryToken(UserHiddenComp), useValue: hiddenCompRepo },
        { provide: CompetitionService, useValue: compService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<HiddenService>(HiddenService);
  });

  describe('getHiddenComps', () => {
    it('should return hidden competitions filtered by available ones', async () => {
      (hiddenCompRepo.find as jest.Mock).mockResolvedValue(mockHiddenComps);
      (compService.findAll as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      const result = await service.getHiddenComps(1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2021);
      expect(result[0].name).toBe('Premier League');
    });

    it('should throw ServiceUnavailableException when competitions are processing', async () => {
      (hiddenCompRepo.find as jest.Mock).mockResolvedValue(mockHiddenComps);
      (compService.findAll as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
      });

      await expect(service.getHiddenComps(1)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('hideComp', () => {
    it('should hide a competition successfully', async () => {
      (compService.findAll as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });
      (compService.findById as jest.Mock).mockResolvedValue({
        data: mockCompetitions[0],
        status: DataStatus.FRESH,
      });
      (hiddenCompRepo.insert as jest.Mock).mockResolvedValue({});

      await service.hideComp(1, 2021);

      expect(hiddenCompRepo.insert).toHaveBeenCalledWith({
        user: { id: 1 },
        competitionId: 2021,
        name: 'Premier League',
        emblem: 'pl.png',
      });
    });

    it('should throw error when competition is not available', async () => {
      (compService.findAll as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });

      await expect(service.hideComp(1, 9999)).rejects.toThrow(
        'Competition is not available',
      );
    });

    it('should throw ServiceUnavailableException when competitions are processing', async () => {
      (compService.findAll as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
      });

      await expect(service.hideComp(1, 2021)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException when fetching competition details fails', async () => {
      (compService.findAll as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });
      (compService.findById as jest.Mock).mockResolvedValue({
        data: null,
        status: DataStatus.PROCESSING,
      });

      await expect(service.hideComp(1, 2021)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw error when competition is already hidden', async () => {
      (compService.findAll as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });
      (compService.findById as jest.Mock).mockResolvedValue({
        data: mockCompetitions[0],
        status: DataStatus.FRESH,
      });
      (hiddenCompRepo.insert as jest.Mock).mockRejectedValue({ code: '23505' });

      await expect(service.hideComp(1, 2021)).rejects.toThrow(
        'Competition is already hidden',
      );
    });

    it('should rethrow other database errors', async () => {
      (compService.findAll as jest.Mock).mockResolvedValue({
        data: mockCompetitions,
        status: DataStatus.FRESH,
      });
      (compService.findById as jest.Mock).mockResolvedValue({
        data: mockCompetitions[0],
        status: DataStatus.FRESH,
      });
      (hiddenCompRepo.insert as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.hideComp(1, 2021)).rejects.toThrow('DB error');
    });
  });

  describe('showComp', () => {
    it('should unhide a competition successfully', async () => {
      const mockUser = {
        id: 1,
        hiddenCompetitions: [
          { id: 1, competitionId: 2021 },
        ],
      };
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);
      (hiddenCompRepo.delete as jest.Mock).mockResolvedValue({});

      await service.showComp(1, 2021);

      expect(hiddenCompRepo.delete).toHaveBeenCalledWith({ id: 1 });
    });

    it('should do nothing when competition is not hidden', async () => {
      const mockUser = {
        id: 1,
        hiddenCompetitions: [],
      };
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      await service.showComp(1, 2021);

      expect(hiddenCompRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.showComp(1, 2021)).rejects.toThrow(
        'User or hidden competitions not found.',
      );
    });

    it('should throw error when user has no hiddenCompetitions', async () => {
      const mockUser = { id: 1 };
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.showComp(1, 2021)).rejects.toThrow(
        'User or hidden competitions not found.',
      );
    });
  });
});
