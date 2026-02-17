import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repo: Partial<Repository<User>>;

  const mockUser: Partial<User> = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    favCompetitions: [],
    favTeams: [],
    hiddenCompetitions: [],
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const email = 'new@example.com';
      const password = 'password123';
      const name = 'New User';

      const createdUser = {
        email,
        password,
        name,
        favCompetitions: [],
        favTeams: [],
        hiddenCompetitions: [],
      };

      (repo.create as jest.Mock).mockReturnValue(createdUser);
      (repo.save as jest.Mock).mockResolvedValue({ id: 1, ...createdUser });

      const result = await service.create(email, password, name);

      expect(repo.create).toHaveBeenCalledWith({
        email,
        password,
        name,
        favCompetitions: [],
        favTeams: [],
        hiddenCompetitions: [],
      });
      expect(repo.save).toHaveBeenCalledWith(createdUser);
      expect(result.id).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return user by id with relations', async () => {
      (repo.find as jest.Mock).mockResolvedValue([mockUser]);

      const result = await service.findOne(1);

      expect(repo.find).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['favCompetitions', 'favTeams', 'hiddenCompetitions'],
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when id is falsy', async () => {
      const result = await service.findOne(0);

      expect(result).toBeNull();
      expect(repo.find).not.toHaveBeenCalled();
    });

    it('should return undefined when user not found', async () => {
      (repo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findOne(999);

      expect(result).toBeUndefined();
    });
  });

  describe('find', () => {
    it('should find users by email', async () => {
      (repo.find as jest.Mock).mockResolvedValue([mockUser]);

      const result = await service.find('test@example.com');

      expect(repo.find).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual([mockUser]);
    });

    it('should return empty array when no users found', async () => {
      (repo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.find('nonexistent@example.com');

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all users with relations', async () => {
      const users = [mockUser, { ...mockUser, id: 2, email: 'other@example.com' }];
      (repo.find as jest.Mock).mockResolvedValue(users);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        relations: ['favCompetitions', 'favTeams', 'hiddenCompetitions'],
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update user attributes', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      (repo.find as jest.Mock).mockResolvedValue([mockUser]);
      (repo.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update(1, { name: 'Updated Name' });

      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when user not found', async () => {
      (repo.find as jest.Mock).mockResolvedValue([]);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove user', async () => {
      (repo.find as jest.Mock).mockResolvedValue([mockUser]);
      (repo.remove as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.remove(1);

      expect(repo.remove).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      (repo.find as jest.Mock).mockResolvedValue([]);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
