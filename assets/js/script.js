
var resultText;
const search = document.querySelector('#submit');
const searchQuery = document.querySelector('#searchQuery');
const results = document.querySelector('#results');
const res_blk = document.querySelector('#res_blk');
const err_blk = document.querySelector('#err_blk');
const loader = document.querySelector('#loader');
const openAiUrl = 'https://api.openai.com/v1/completions';
const dalleImageURL = 'https://api.openai.com/v1/images/generations';
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${window.OPEN_AI_KEY}`
}

search.addEventListener('click', function() {
  if(!searchQuery.value) {return}
  getCompletions();
})

async function getCompletions() {
  let prompt;
  loader.classList.remove('d-none');
  answer.classList.add('d-none');
  res_blk.classList.add('d-none');
  results.innerHTML = null;
  resultText = null;
  err_blk.classList.add('d-none');
  err_blk.innerHTML = null;

  prompt = `"""Write an Indian recipe that only uses the following ingredients. If it is not an Indian recepie, just say 'Not an Indian food'. (you can include olive oil, seasoning and dried spice): ${searchQuery.value}"""`;
  // prompt = `"""Write a recipe that only uses the following ingredients. If it is not a food recepie, just say 'Not a food recepie'. (you can include olive oil, seasoning and dried spice): ${searchQuery.value}"""`;

  const data = {
    model: "gpt-3.5-turbo-instruct",
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 500,
    stream: true,
    n: 1,
    prompt
  }

  const dataObj = {
    method: 'POST',
    cache: 'no-cache',
    headers: headers,
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(data)
  }

  try {
    const response = await fetch(openAiUrl,dataObj);
    if(!response.ok) {
      const responseData = await response.json();
      throw responseData.error;
    }
    res_blk.classList.remove('d-none');
    for await (const measurement of parseJsonStream(response.body)) {
      resultText += measurement.replace(/\n/g, "<br/>");
      resultText = resultText.replaceAll('<br/><br/>', '<br/>').replace(/null/, '');
      results.innerHTML = resultText;
    }
  } catch (error) {
    console.log(error);
    err_blk.classList.remove('d-none');
    err_blk.innerHTML = error.message;
    answer.classList.remove('d-none');
    loader.classList.add('d-none');
  }

}

  function isJson(str) {
    try {
      return JSON.parse(str)
    } catch (error) {
      return false
    }
  }

  async function *parseJsonStream(readableStream) {
    for await (const line of readLines(readableStream.getReader())) {
        const trimmedLine = line.split('data: ')[1]
        if(isJson(trimmedLine)) {
          yield isJson(trimmedLine).choices[0]?.text
        } else {
          yield ''
        }

    }
}

async function *readLines(reader) {
    const textDecoder = new TextDecoder();
    let partOfLine = '';
    for await (const chunk of readChunks(reader)) {
        const chunkText = textDecoder.decode(chunk);
        const chunkLines = chunkText.split('\n');
        if (chunkLines.length === 1) {
            partOfLine += chunkLines[0];
        } else if (chunkLines.length > 1) {
            yield partOfLine + chunkLines[0];
            for (let i=1; i < chunkLines.length - 1; i++) {
                yield chunkLines[i];
            }
            partOfLine = chunkLines[chunkLines.length - 1];
        }
    }
}

function readChunks(reader) {
    return {
        async* [Symbol.asyncIterator]() {
            let readResult = await reader.read();
            while (!readResult.done) {
                yield readResult.value;
                readResult = await reader.read();
            }
            if(readResult.done) {
              if(resultText.includes('Not an Indian food')) {
                img_blk.innerHTML = null;
              } else {
                const imgData = {
                  prompt: searchQuery.value,
                  n: 1,
                  response_format: 'b64_json',
                  size: "256x256"
                }
                const imgDataObj = {
                  method: 'POST',
                  cache: 'no-cache',
                  headers: headers,
                  referrerPolicy: 'no-referrer',
                  body: JSON.stringify(imgData)
                }
                const imgResponse = await fetch(dalleImageURL,imgDataObj)
                const responseData = await imgResponse.json();
                const image_url = 'data:image/png;base64,' + responseData.data[0].b64_json;
                img_blk.innerHTML = `<br/><img src="${image_url}" class="d-block w-75 m-auto" alt="...">`;
              }
              loader.classList.add('d-none');
              answer.classList.remove('d-none');
            }
        },
    };
}

searchQuery.addEventListener('mouseover', function() {
  searchQuery.value = null;
})
