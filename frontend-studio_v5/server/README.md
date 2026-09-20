# Server

Code to run backtivisda script in the server

## Requirements

-   `images_manipulator` and all its dependencies
    (version 0.0.2)
-   Install `requirements.txt`

```
pip install -r requirements.txt
```

## Getting Started

### Environment Variables

Create `.env` file with:

-   `SECRET_KEY`
-   `USERS` : the list of the authenticated users

### Developement

```
export FLASK_APP=main;flask run --port 4000 --debugger --reload
```

### Create tokens for your users:

Script `scripts/create_token.py`

## Production

```
sudo docker build -t aktivisdaserver:latest .
```

```
sudo docker run -p 4000:4000 -t aktivisdaserver:latest
```

Add to your `nginx` conf:

```
client_max_body_size 10M;
```

## Test

`pytest` is required

```shell
pytest
```