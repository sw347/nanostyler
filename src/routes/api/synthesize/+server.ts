import { GOOGLE_AI_KEY } from '$env/static/private';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';

async function fileToGenerativePart(file: any) {
	const buffer = await file.arrayBuffer();
	return {
		inlineData: {
			data: Buffer.from(buffer).toString('base64'),
			mimeType: file.type
		}
	};
}

export async function POST({ request }) {
	const formData = await request.formData();
	const personFile = formData.get('person');
	const itemFiles = formData.getAll('items');

	if (!personFile || itemFiles.length === 0) {
		return new Response('인물 사진과 아이템 파일이 필요합니다.', { status: 400 });
	}

	try {
		const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_KEY });

		const personPart = await fileToGenerativePart(personFile);
		const itemParts = await Promise.all(itemFiles.map(fileToGenerativePart));

		const prompt = [
			{ text: '이 인물 사진을 베이스로,' },
			personPart,
			{ text: '이 아이템(들)을 착용한 합성 이미지를 생성해 줘. 스타일리시하고 사실적인 느낌으로.' },
			...itemParts
		];

		const result = await ai.models.generateContent({
			model: 'gemini-2.5-flash-image',
			contents: prompt
		});

		if (!result.candidates || result.candidates.length === 0) {
			throw new Error('AI가 유효한 응답을 생성하지 못했습니다. (안전 필터 등 확인)');
		}

		const candidate = result.candidates[0];

		if (!candidate.content || !candidate.content.parts) {
			throw new Error('AI 응답에 content.parts가 없습니다.');
		}

		for (const part of candidate.content.parts) {
			if (part.inlineData) {
				const imageData: string | undefined = part.inlineData.data;
				if (imageData) {
					const buffer = Buffer.from(imageData, 'base64');
					fs.writeFileSync('gemini-native-image.png', buffer);

					return new Response(buffer, {
						headers: {
							'Content-Type': part.inlineData.mimeType || 'image/png'
						}
					});
				} else {
					throw Error('Image data is undefined.');
				}
			}
		}

		throw new Error('AI가 이미지를 생성하지 못했습니다.');
	} catch (error) {
		return new Response('AI 서버에서 오류가 발생했습니다.', { status: 500 });
	}
}
