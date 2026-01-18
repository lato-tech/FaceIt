import argparse
import json

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', required=True)
    parser.add_argument('--age', action='store_true')
    parser.add_argument('--emotion', action='store_true')
    args = parser.parse_args()

    try:
        from deepface import DeepFace  # type: ignore
    except Exception as e:
        print(json.dumps({'error': f'DeepFace import error: {e}'}))
        return 1

    actions = []
    if args.age:
        actions.append('age')
    if args.emotion:
        actions.append('emotion')

    try:
        analysis = DeepFace.analyze(
            img_path=args.image,
            actions=actions,
            enforce_detection=False
        )
        if isinstance(analysis, list):
            analysis = analysis[0]
        result = {}
        if args.age and 'age' in analysis:
            result['age'] = int(analysis['age'])
        if args.emotion:
            result['emotion'] = analysis.get('dominant_emotion')
        print(json.dumps(result))
        return 0
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
