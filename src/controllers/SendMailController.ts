import { Request, Response } from "express";
import { getCustomRepository } from "typeorm";
import { SurveysRepository } from "../repositories/SurveysRepository";
import { UsersRepository } from "../repositories/UsersRepository";
import { UsersSurveysRepository } from "../repositories/UsersSurveysRepository";
import SendMailService from "../services/SendMailService";
import { resolve } from 'path';
import { AppError } from "../errors/AppError";

class SendMailController {
    async execute(request: Request, response: Response) {
        const { email, survey_id, value} = request.body;

        const usersRepository = getCustomRepository(UsersRepository);
        const surveyRepository = getCustomRepository(SurveysRepository);
        const usersSurveysRepository = getCustomRepository(UsersSurveysRepository);

        const userAlreadyExists = await usersRepository.findOne({email});

        if(!userAlreadyExists) {
            throw new AppError("User does not exist")
        }

        const surveyAlreadyExists = await surveyRepository.findOne({id: survey_id})

        
        if(!surveyAlreadyExists) {
            throw new AppError("Survey does not exist")
        }

        const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs")

        const sameSurveyAndUserAlreadyExist = await usersSurveysRepository.findOne({
            where: {user_id: userAlreadyExists.id, value:null},
            relations: ["user","survey"]
        })

        const variables = {
            name: userAlreadyExists.name,
            title: surveyAlreadyExists.title,
            description: surveyAlreadyExists.description,
            id: "",
            link: process.env.URL_MAIL
        }

        if(sameSurveyAndUserAlreadyExist) {
            variables.id = sameSurveyAndUserAlreadyExist.id;
            await SendMailService.execute(email, surveyAlreadyExists.title, variables, npsPath);
            return response.json(sameSurveyAndUserAlreadyExist)
        }

        const userSurvey =  usersSurveysRepository.create({
            user_id:userAlreadyExists.id,
            survey_id:surveyAlreadyExists.id,
            value: value
        });


        await usersSurveysRepository.save(userSurvey)
        variables.id = userSurvey.id

        await SendMailService.execute(
            email,
            surveyAlreadyExists.title,
            variables,
            npsPath
        )

        return response.json(userSurvey)
    }
}

export { SendMailController }