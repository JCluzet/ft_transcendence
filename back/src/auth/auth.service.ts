import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
// eslint-disable-next-line prettier/prettier
import { API_SECRET, API_UID, API_URL, APP_LOGIN_REDIRECT, TWOFA_LENGTH, INTRA_API_URL, ADMIN_NAME } from 'src/constant';
import { Trole } from 'src/users/interfaces/role.type';
import { EUser } from 'src/users/interfaces/user.entity';
import { UsersService } from 'src/users/users.service';
import { randNum } from 'src/utils/utils';
import { Repository } from 'typeorm';
import { ILoginSuccess } from './interfaces/loginSuccess.interface';
import { Etwofa } from './interfaces/twofa.entity';
import * as bcrypt from 'bcrypt';
import { IUserData } from './interfaces/userData.interface';

@Injectable()
export class AuthService {
  private twoFaCode: number;

  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(Etwofa)
    private twoFaRepository: Repository<Etwofa>,
  ) {
    this.twoFaCode = Math.floor(10000 + Math.random() * 90000);
  }

  async get42Token(authorization_code: string) {
    const requestUri: string = INTRA_API_URL + '/oauth/token';
    const response = await axios.post(
      requestUri,
      {
        grant_type: 'authorization_code',
        client_id: API_UID,
        client_secret: API_SECRET,
        code: authorization_code,
        scope: 'public',
        redirect_uri: APP_LOGIN_REDIRECT,
      },
      {
        headers: {
          'Accept-Encoding': 'application/json',
        },
      },
    );
    return response.data;
  }

  async get42LoginWithToken(Token: string): Promise<IUserData> {
    const reqUri: string = INTRA_API_URL + '/v2/me';

    const response = await axios.get(reqUri, {
      headers: {
        Authorization: 'Bearer ' + Token,
        'Accept-Encoding': 'application/json',
      },
    });
    const userData: IUserData = {
      login: response.data.login,
      avatarUrl: response.data.image.versions.medium,
    };
    return userData;
  }

  deliverToken(login: string, role: Trole): string {
    const payload = { sub: login, role: role };
    return this.jwtService.sign(payload);
  }

  // eslint-disable-next-line prettier/prettier
  async logReponseByLogin(apiUserData: IUserData, twofa: 'yes' | 'no' | 'auto' = 'auto'): Promise<ILoginSuccess> {
    let userCreate: boolean;
    let userRole: Trole;
    let userData: EUser;
    if ((userData = await this.userService.findUserByLogin(apiUserData.login))) {
      userRole = userData.role;
      userCreate = false;
    } else {
      if (apiUserData.login === 'jdamoise' || apiUserData.login === 'bmaudet' || apiUserData.login === 'jcluzet' || apiUserData.login === 'tkomaris' || apiUserData.login === 'mwane') userRole = 'admin';
      else userRole = 'user';
      userCreate = true;
      userData = {
        login: apiUserData.login,
        name: apiUserData.login,
        role: userRole,
        isTwoFa: false,
        avatarUrl: apiUserData.avatarUrl,
        nbLoses: 0,
        nbWins: 0,
      };
      await this.userService.createUser(userData);
    }
    let twofaChoice: boolean;
    if (twofa === 'yes') twofaChoice = true;
    else if (twofa === 'no') twofaChoice = false;
    else twofaChoice = userData.isTwoFa;
    if (twofaChoice) {
      const code: string = randNum(TWOFA_LENGTH);
      const hash: string = await bcrypt.hash(code, 1);
      const expDate: Date = new Date(new Date().getTime() + 1000 * 600);
      const twoFa: Etwofa = {
        login: userData.login,
        code: hash,
        expirationDate: expDate,
      };
      try {
        await this.twoFaRepository.save(twoFa);
      } catch (err) {
        throw err;
      }
    }
    const logSuccess: ILoginSuccess = {
      login: userData.login,
      userCreate: userCreate,
      twofa: twofaChoice,
      apiToken: twofaChoice ? '' : this.deliverToken(apiUserData.login, userRole),
      // eslint-disable-next-line prettier/prettier
      expDate: twofaChoice ? new Date(new Date().getTime() + 1000 * 600) : new Date(new Date().getTime() + 1000 * 3600),
    };
    Logger.log(`logsuccess.apiToken: ${logSuccess.apiToken}, towfa: ${twofaChoice}`);
    return logSuccess;
  }

  // eslint-disable-next-line prettier/prettier
  async logReponseByCode(code: string, twofa: 'yes' | 'no' | 'auto' = 'auto'): Promise<ILoginSuccess> {
    const ftTokens = await this.get42Token(code);
    const userData: IUserData = await this.get42LoginWithToken(ftTokens.access_token);
    Logger.log(`userData.login: ${userData.login}, userData.picture: ${userData.avatarUrl}`);
    return await this.logReponseByLogin(userData, twofa);
  }

  async checkTwoFaCode(login: string, twoFaCode: string): Promise<boolean> {
    try {
      // eslint-disable-next-line prettier/prettier
      const twofaLine: Etwofa[] = await this.twoFaRepository.find({ where: { login: login } });
      if (twofaLine) {
        const isMatch = await bcrypt.compare(twoFaCode, twofaLine[0].code);
        // eslint-disable-next-line prettier/prettier
        if (new Date(twofaLine[0].expirationDate).getTime() < new Date().getTime()) return false;
        return isMatch;
      } else throw new Error('Bad login');
    } catch (err) {
      throw err;
    }
  }
}
