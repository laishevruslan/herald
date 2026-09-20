import jwt
import os
import sys
from dotenv import load_dotenv

load_dotenv()

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python3 create_token.py <username>')
        sys.exit(1)

    # Warning. Maybe an expiration date
    token = jwt.encode({'aktivisda_user': sys.argv[1]},
                    os.environ.get('SECRET_KEY'), 'HS256')
    print(token)